import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongCard from '../components/music/SongCard';
import { songService } from '../services/songService';
import IntelligentSearch from '../components/search/IntelligentSearch';

const POPULAR_SEARCHES = [
  'relaxing jazz', 'energetic rock', 'chill lofi', 'party hits',
  'acoustic folk', 'electronic beats', 'classical piano', 'r&b soul',
];

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [searchMeta, setSearchMeta] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aiRecentSearches') || '[]'); }
    catch { return []; }
  });
  const [suggestions, setSuggestions] = useState([]);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const updateRecent = useCallback((term) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 6);
    setRecentSearches(updated);
    localStorage.setItem('aiRecentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSongs([]);
      setSearchMeta(null);
      setIsFallback(false);
      return;
    }
    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await songService.aiSearch(searchQuery);
      if (response?.success) {
        setSongs(response.data || []);
        setIsFallback(response.fallback === true);
        setSearchMeta(response.interpretation || response.meta || null);
      } else {
        setSongs([]);
        setIsFallback(true);
        setSearchMeta(null);
      }
      updateRecent(searchQuery);
    } catch (err) {
      setSongs([]);
      setIsFallback(true);
      setSearchMeta(null);
    } finally {
      setLoading(false);
    }
  }, [updateRecent]);

  const fetchSuggestions = useCallback(async (prefix) => {
    if (prefix.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await songService.getSongs({ search: prefix });
      if (data?.length) {
        const titles = [...new Set(data.map((s) => s.title).filter(Boolean))].slice(0, 5);
        const artists = [...new Set(data.map((s) => s.artist).filter(Boolean))].slice(0, 3);
        setSuggestions([...titles.map((t) => ({ text: t, type: 'song' })), ...artists.map((a) => ({ text: a, type: 'artist' }))]);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
      setSearchParams(debouncedQuery ? { q: debouncedQuery } : {}, { replace: true });
    }
  }, [debouncedQuery]);

  useEffect(() => {
    fetchSuggestions(query);
    setShowSuggestions(query.trim().length >= 2);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setSongs([]);
    setSearchMeta(null);
    setIsFallback(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  const handleSelectRecent = (term) => {
    setQuery(term);
    performSearch(term);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (text) => {
    setQuery(text);
    performSearch(text);
    setShowSuggestions(false);
  };

  const badgeIcon = (mood) => {
    const map = { happy: '😊', sad: '😢', energetic: '⚡', chill: '😎', romantic: '💕', angry: '😠', focused: '🧠', nostalgic: '📻' };
    return map[mood?.toLowerCase()] || '🎵';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="glass-dark rounded-2xl border border-white/10 p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary-500/10 via-accent-500/5 to-transparent blur-3xl pointer-events-none" />
        <h1 className="text-3xl md:text-4xl font-black mb-2 bg-gradient-to-r from-primary-400 via-accent-400 to-cyan-400 bg-clip-text text-transparent">
          AI-Powered Search
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mb-6">
          Describe the vibe, mood, genre, or anything you&apos;re looking for — our AI will find the perfect match.
        </p>

        <div className="relative w-full max-w-2xl" ref={wrapperRef}>
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (query.trim().length >= 2) setShowSuggestions(true); }}
              placeholder="Search by mood, genre, artist, song... (e.g. 'relaxing jazz for studying')"
              className="w-full bg-white/5 border border-white/10 rounded-full px-12 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition text-sm md:text-base"
            />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4" />
            </svg>
            {query && (
              <button onClick={handleClear} className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                ✕
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute z-50 w-full mt-2 glass-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
              {recentSearches.length > 0 && (
                <div className="p-2 border-b border-white/10">
                  <p className="text-xs text-slate-500 px-3 py-1 font-medium uppercase tracking-wider">Recent</p>
                  {recentSearches.map((term, i) => (
                    <button key={i} onClick={() => handleSelectRecent(term)} className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-slate-500">🕐</span>
                      {term}
                    </button>
                  ))}
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <p className="text-xs text-slate-500 px-3 py-1 font-medium uppercase tracking-wider">Suggestions</p>
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSelectSuggestion(s.text)} className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-slate-500">{s.type === 'artist' ? '🎤' : '🎵'}</span>
                      {s.text}
                      <span className="ml-auto text-xs text-slate-600">{s.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popular Searches */}
        {!query && recentSearches.length === 0 && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => { setQuery(term); performSearch(term); }}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Recent Searches</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSelectRecent(term)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />
            AI is analyzing your request...
          </div>
        )}
      </div>

      {/* Search Metadata */}
      {searchMeta && !loading && query && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-slate-400">Results for &ldquo;{query}&rdquo;</span>
          {searchMeta.mood && (
            <span className="px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300">
              {badgeIcon(searchMeta.mood)} {searchMeta.mood}
            </span>
          )}
          {searchMeta.primary_genre && (
            <span className="px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-xs text-accent-300">
              🎵 {searchMeta.primary_genre}
            </span>
          )}
          {searchMeta.tempo && (
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
              ⚡ {searchMeta.tempo}
            </span>
          )}
          {!isFallback ? (
            <span className="px-2.5 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-xs text-primary-300 font-semibold">
              ✦ AI-powered
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 text-xs text-slate-400">
              Basic search
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {query && !loading && songs.length === 0 && (
        <div className="glass-dark rounded-2xl p-12 md:p-16 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
          <p className="text-slate-400 mb-2">We couldn&apos;t find any songs for &ldquo;{query}&rdquo;</p>
          <p className="text-slate-500 text-sm mb-6">Try different keywords or browse our popular searches above</p>
          <button onClick={handleClear} className="px-6 py-2.5 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-600 transition">
            Try a new search
          </button>
        </div>
      )}

      {query && songs.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{isFallback ? 'Results' : 'AI-matched results'}</h2>
          <span className="text-sm text-slate-400">{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {songs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {songs.map((song) => (
            <div key={song.id} className="relative">
              {query && !isFallback && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-600/90 text-white backdrop-blur-md font-semibold shadow-lg">
                    ✦ AI Match
                  </span>
                </div>
              )}
              <SongCard
                song={song}
                titleRenderer={(title) => {
                  if (!query || !title) return title;
                  const parts = title.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                  return parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase()
                      ? <mark key={i} className="bg-primary-500/30 text-primary-200 px-0.5 rounded">{part}</mark>
                      : part
                  );
                }}
                artistRenderer={(artist) => {
                  if (!query || !artist) return artist;
                  const parts = artist.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                  return parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase()
                      ? <mark key={i} className="bg-primary-500/30 text-primary-200 px-0.5 rounded">{part}</mark>
                      : part
                  );
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty initial state */}
      {!query && songs.length === 0 && !loading && (
        <div className="glass-dark rounded-2xl p-12 md:p-16 text-center">
          <div className="text-6xl mb-4">🎧</div>
          <h3 className="text-xl font-bold text-white mb-2">What are you looking for?</h3>
          <p className="text-slate-400">Search by mood, genre, artist, or song title. Try something like &ldquo;chill beats for coding&rdquo;</p>
        </div>
      )}
    </div>
  );
}
