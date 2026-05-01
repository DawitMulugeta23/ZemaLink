// src/components/search/IntelligentSearch.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';

export const IntelligentSearch = ({ onResultSelect, placeholder = "Search by mood, genre, artist, or song..." }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchInterpretation, setSearchInterpretation] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const searchRef = useRef(null);
    let debounceTimer = null;
    let suggestionTimer = null;
    
    useEffect(() => {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            } catch (e) {
                console.error('Failed to parse recent searches:', e);
            }
        }
    }, []);
    
    const saveSearch = async (searchQuery) => {
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem('recent_searches', JSON.stringify(updated));
        
        try {
            await api.post('search/track', { query: searchQuery });
        } catch (error) {
            console.error('Failed to track search:', error);
        }
    };
    
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setSearchInterpretation(null);
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await api.get(`search?q=${encodeURIComponent(searchQuery)}`);
            if (response.success) {
                setResults(response.data || []);
                setSearchInterpretation(response.interpretation);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const getSuggestions = useCallback(async (searchQuery) => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }
        
        try {
            const response = await api.get(`search?q=${encodeURIComponent(searchQuery)}&type=suggestions`);
            if (response.success && response.suggestions) {
                setSuggestions(response.suggestions);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error('Failed to get suggestions:', error);
        }
    }, []);
    
    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(value), 300);
        
        if (suggestionTimer) clearTimeout(suggestionTimer);
        suggestionTimer = setTimeout(() => getSuggestions(value), 150);
    };
    
    const handleSearch = async () => {
        if (!query.trim()) return;
        await saveSearch(query);
        performSearch(query);
        setShowSuggestions(false);
    };
    
    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.value);
        performSearch(suggestion.value);
        setShowSuggestions(false);
        saveSearch(suggestion.value);
    };
    
    const handleResultClick = (song) => {
        saveSearch(query);
        if (onResultSelect) {
            onResultSelect(song);
        }
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (suggestionTimer) clearTimeout(suggestionTimer);
        };
    }, []);
    
    const getSuggestionIcon = (type) => {
        switch(type) {
            case 'artist': return '🎤';
            case 'genre': return '🎵';
            case 'song': return '🎧';
            default: return '🔍';
        }
    };
    
    const getMoodEmoji = (mood) => {
        const emojis = {
            happy: '😊',
            sad: '😢',
            energetic: '⚡',
            chill: '😎',
            romantic: '💕',
            angry: '😠',
            focused: '🧠',
            nostalgic: '📻'
        };
        return emojis[mood] || '🎵';
    };
    
    return (
        <div className="relative w-full max-w-2xl mx-auto" ref={searchRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={placeholder}
                    className="glass-input w-full py-3 pl-12 pr-4 text-white placeholder-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isLoading && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="loading-spinner w-5 h-5"></div>
                    </div>
                )}
            </div>
            
            {searchInterpretation && searchInterpretation.search_intent && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    {searchInterpretation.mood && (
                        <span className="px-2 py-1 bg-white/10 rounded-full">
                            {getMoodEmoji(searchInterpretation.mood)} {searchInterpretation.mood} mood
                        </span>
                    )}
                    {searchInterpretation.primary_genre && (
                        <span className="px-2 py-1 bg-white/10 rounded-full">
                            🎵 {searchInterpretation.primary_genre}
                        </span>
                    )}
                    {searchInterpretation.tempo && (
                        <span className="px-2 py-1 bg-white/10 rounded-full">
                            ⚡ {searchInterpretation.tempo} tempo
                        </span>
                    )}
                    <span className="px-2 py-1 bg-purple-500/30 rounded-full">
                        🤖 AI-powered
                    </span>
                </div>
            )}
            
            {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
                <div className="absolute z-50 w-full mt-2 glass-card overflow-hidden max-h-96 overflow-y-auto">
                    {recentSearches.length > 0 && query.length < 2 && (
                        <div className="p-2 border-b border-white/10">
                            <div className="text-xs text-white/50 mb-2 px-2">Recent Searches</div>
                            {recentSearches.map((search, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setQuery(search);
                                        performSearch(search);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition flex items-center gap-2"
                                >
                                    <span className="text-white/50">🕐</span>
                                    <span>{search}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="text-xs text-white/50 mb-2 px-2">Suggestions</div>
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition flex items-center gap-2"
                                >
                                    <span>{getSuggestionIcon(suggestion.type)}</span>
                                    <span>{suggestion.value}</span>
                                    <span className="text-xs text-white/40 ml-auto">{suggestion.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {results.length > 0 && !showSuggestions && (
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto custom-scroll">
                    {results.map((song, idx) => (
                        <div
                            key={song.id || idx}
                            onClick={() => handleResultClick(song)}
                            className="glass-card p-3 cursor-pointer hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500">
                                    {song.cover_image && song.cover_image !== 'null' ? (
                                        <img src={song.cover_image} alt={song.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium truncate">{song.title}</h4>
                                        {song.is_premium && (
                                            <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Pro</span>
                                        )}
                                        {song.relevance_score > 0.8 && (
                                            <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">Best Match</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/60 truncate">{song.artist}</p>
                                    {song.match_reason && (
                                        <p className="text-xs text-white/40 truncate">🎯 {song.match_reason}</p>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-white/40">
                                    <span>❤️ {song.likes_count || 0}</span>
                                    <span>▶️ {song.plays || 0}</span>
                                    <span>⭐ {song.rating || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {query && !isLoading && results.length === 0 && !showSuggestions && (
                <div className="mt-4 p-8 text-center glass-card">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-white/70">No songs found for "{query}"</p>
                    <p className="text-white/40 text-sm mt-2">Try different keywords or browse our trending tracks</p>
                </div>
            )}
        </div>
    );
};

export default IntelligentSearch;