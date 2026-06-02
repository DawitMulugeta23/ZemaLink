import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongCard from '../components/music/SongCard';
import { songService } from '../services/songService';
import { ITEMS_PER_PAGE } from '../constants';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'top-rated', label: 'Top Rated' },
];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
        <div key={i} className="skeleton p-4">
          <div className="aspect-square rounded-2xl bg-white/10 mb-4" />
          <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
          <div className="h-3 bg-white/10 rounded w-1/2 mb-3" />
          <div className="h-4 bg-white/10 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('popular');
  const [page, setPage] = useState(1);
  const [totalSongs, setTotalSongs] = useState(0);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalSongs / ITEMS_PER_PAGE));

  const loadSongs = useCallback(async (opts = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (opts.search || searchQuery) params.search = opts.search || searchQuery;
      params.page = opts.page || page;
      params.limit = ITEMS_PER_PAGE;
      let data = await songService.getSongs(params);

      if (!data || data.length === 0) {
        setSongs([]);
        setTotalSongs(0);
        return;
      }

      let sorted = [...data];
      const sort = opts.sort || sortBy;
      if (sort === 'popular') {
        sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0) || (b.plays || 0) - (a.plays || 0));
      } else if (sort === 'newest') {
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else if (sort === 'top-rated') {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      setSongs(sorted);
      setTotalSongs(sorted.length);
    } catch (err) {
      setError('Failed to load songs. Please try again.');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, page]);

  useEffect(() => {
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort');
    if (searchParam) setSearchQuery(searchParam);
    if (sortParam) setSortBy(sortParam);
  }, []);

  useEffect(() => {
    loadSongs({ search: searchQuery, sort: sortBy, page: 1 });
  }, [searchQuery, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    loadSongs({ search: searchQuery, sort: sortBy, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadSongs({ page: newPage });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSortBy('popular');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveSearch = !!searchQuery;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search & Sort */}
      <div className="glass-dark rounded-2xl border border-white/10 p-4 md:p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, albums..."
                className="input-field !pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold hover:scale-105 transition shrink-0">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface-900">{opt.label}</option>
              ))}
            </select>
          </div>

          {hasActiveSearch && (
            <button onClick={handleClearSearch} className="text-xs text-accent-400 hover:text-accent-300 transition whitespace-nowrap">
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <GridSkeleton />
      ) : error ? (
        <div className="glass-dark rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={() => loadSongs({ page: 1 })} className="px-6 py-2 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-600 transition">
            Retry
          </button>
        </div>
      ) : songs.length === 0 ? (
        <div className="glass-dark rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🎵</div>
          <p className="text-slate-400 text-lg mb-2">No songs found</p>
          <p className="text-slate-500 text-sm mb-6">
            {hasActiveSearch ? 'Try adjusting your search query.' : 'No songs have been uploaded yet.'}
          </p>
          {hasActiveSearch && (
            <button onClick={handleClearSearch} className="px-6 py-2 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-600 transition">
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-6">
            {totalSongs} song{totalSongs !== 1 ? 's' : ''} found
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                &larr; Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                    p === page
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
