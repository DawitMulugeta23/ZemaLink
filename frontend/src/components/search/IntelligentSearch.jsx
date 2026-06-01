import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { songService } from '../../services/songService';
import { debounce } from '../../utils/helpers';

const MOOD_EMOJIS = {
  happy: '\u{1F60A}', sad: '\u{1F622}', energetic: '\u{26A1}',
  chill: '\u{1F60E}', romantic: '\u{1F495}', angry: '\u{1F620}',
  focused: '\u{1F9E0}', nostalgic: '\u{1F4FB}',
};

const RECENT_KEY = 'zema_recent_searches';

export default function IntelligentSearch({ onSearch, placeholder }) {
  const { isDark } = useTheme();
  const ref = useRef(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      setRecentSearches(saved.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  const saveRecent = useCallback((term) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term, ...prev.filter((s) => s !== term)].slice(0, 10);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const doSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setResults([]);
      setMetadata(null);
      setStatus('idle');
      return;
    }
    setIsLoading(true);
    setStatus('loading');
    try {
      const res = await songService.aiSearch(term);
      const data = Array.isArray(res) ? res : res?.data || res?.songs || [];
      setResults(data);
      setMetadata(res?.interpretation || res?.metadata || null);
      setStatus(data.length === 0 ? 'empty' : 'results');
      saveRecent(term);
    } catch {
      setResults([]);
      setMetadata(null);
      setStatus('empty');
    } finally {
      setIsLoading(false);
    }
  }, [saveRecent]);

  const debouncedSearch = useRef(
    debounce((term) => doSearch(term), 300)
  ).current;

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    if (val.trim().length >= 1) {
      setShowDropdown(true);
      debouncedSearch(val);
    } else {
      setShowDropdown(false);
      setStatus('idle');
    }
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    doSearch(query.trim());
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    const all = [...suggestions, ...recentSearches.map((s) => ({ value: s, type: 'recent' }))];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, all.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && all[activeIndex]) {
      const term = all[activeIndex].value;
      setQuery(term);
      doSearch(term);
      setShowDropdown(false);
    } else if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const pickSuggestion = (term) => {
    setQuery(term);
    doSearch(term);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestionTypeIcon = (type) => {
    switch (type) {
      case 'artist': return '\u{1F3A4}';
      case 'genre': return '\u{1F3B5}';
      case 'song': return '\u{1F3A7}';
      case 'recent': return '\u{23F0}';
      default: return '\u{1F50D}';
    }
  };

  const suggestionTypeLabel = (type) => {
    switch (type) {
      case 'artist': return 'Artist';
      case 'genre': return 'Genre';
      case 'song': return 'Song';
      case 'recent': return 'Recent';
      default: return '';
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto" ref={ref}>
      <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
        isDark
          ? 'bg-slate-900/80 border-white/10 focus-within:border-purple-500/50 focus-within:shadow-lg focus-within:shadow-purple-500/10'
          : 'bg-white/80 border-slate-200 focus-within:border-purple-400/50 focus-within:shadow-lg focus-within:shadow-purple-400/10'
      } backdrop-blur-xl`}>
        <svg className={`absolute left-4 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowDropdown(true)}
          placeholder={placeholder || 'Search by mood, genre, artist, or song...'}
          className={`w-full py-4 pl-12 pr-24 text-base outline-none bg-transparent transition-colors ${
            isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
          }`}
          aria-label="Search"
          autoComplete="off"
        />
        <div className="absolute right-3 flex items-center gap-2">
          <svg className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isDark
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-40'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 disabled:opacity-40'
            } disabled:cursor-not-allowed shadow-lg shadow-purple-500/20`}
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : 'Search'}
          </button>
        </div>
      </div>

      {metadata && (
        <div className="mt-3 flex flex-wrap items-center gap-2 animate-slide-up">
          {metadata.mood && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}>
              {MOOD_EMOJIS[metadata.mood] || '\u{1F3B5}'} {metadata.mood} mood
            </span>
          )}
          {metadata.primary_genre && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-pink-500/20 text-pink-300 border border-pink-500/20' : 'bg-pink-100 text-pink-700 border border-pink-200'
            }`}>
              {metadata.primary_genre}
            </span>
          )}
          {metadata.tempo && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
            }`}>
              {metadata.tempo} tempo
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            AI-powered
          </span>
        </div>
      )}

      {showDropdown && (
        <div className={`absolute z-50 w-full mt-2 rounded-2xl border shadow-2xl overflow-hidden animate-slide-up ${
          isDark
            ? 'bg-slate-900/95 border-white/10 backdrop-blur-2xl'
            : 'bg-white/95 border-slate-200 backdrop-blur-2xl'
        }`}>
          {query.trim().length < 2 ? (
            recentSearches.length > 0 && (
              <div className="p-2">
                <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Recent Searches
                </p>
                {recentSearches.map((term, idx) => (
                  <button
                    key={term}
                    onClick={() => pickSuggestion(term)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 ${
                      activeIndex === idx
                        ? isDark ? 'bg-purple-500/20 text-white' : 'bg-purple-100 text-slate-900'
                        : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{'\u{23F0}'}</span>
                    <span className="text-sm font-medium truncate">{term}</span>
                  </button>
                ))}
              </div>
            )
          ) : status === 'loading' ? (
            <div className="flex items-center justify-center py-8">
              <div className={`h-8 w-8 rounded-full border-2 animate-spin ${
                isDark ? 'border-slate-700 border-t-purple-500' : 'border-slate-300 border-t-purple-500'
              }`} />
            </div>
          ) : status === 'empty' && results.length === 0 ? (
            <div className="py-10 text-center">
              <span className="text-3xl block mb-2">{'\u{1F50D}'}</span>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No suggestions found</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Try different keywords</p>
            </div>
          ) : (
            suggestions.length > 0 && (
              <div className="p-2">
                <p className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Suggestions
                </p>
                {suggestions.map((s, idx) => (
                  <button
                    key={`s-${idx}`}
                    onClick={() => pickSuggestion(s.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-150 ${
                      activeIndex === idx
                        ? isDark ? 'bg-purple-500/20 text-white' : 'bg-purple-100 text-slate-900'
                        : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{suggestionTypeIcon(s.type)}</span>
                    <span className="text-sm font-medium truncate flex-1">{s.value}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
                    }`}>{suggestionTypeLabel(s.type)}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {status === 'results' && results.length > 0 && !showDropdown && (
        <div className={`mt-4 rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 animate-slide-up ${
          isDark ? 'bg-slate-900/90 border-white/10 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'
        }`}>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Results ({results.length})
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scroll divide-y divide-white/5">
            {results.map((song, idx) => (
              <div
                key={song.id || idx}
                onClick={() => {
                  if (onSearch) onSearch(song, metadata);
                }}
                className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 ${
                  isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                  {song.cover_image && song.cover_image !== 'null' ? (
                    <img src={song.cover_image} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">{'\u{1F3B5}'}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {song.title}
                    </h4>
                    {song.relevance_score > 0.8 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                        Best Match
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{song.artist}</p>
                  {song.match_reason && (
                    <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {song.match_reason}
                    </p>
                  )}
                </div>
                <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  <span>{song.likes_count || 0} likes</span>
                  <span>{song.plays || 0} plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
