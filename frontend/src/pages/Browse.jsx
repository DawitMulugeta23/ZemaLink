import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SongCard from '../components/music/SongCard';
import { songService } from '../services/songService';
import { GENRES, ITEMS_PER_PAGE } from '../constants';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'top-rated', label: 'Top Rated' },
];

const MEDIA_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-3xl bg-white/5 border border-white/[0.08] p-4">
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
  const [selectedGenre, setSelectedGenre] = useState(searchParams.get('genre') || 'All');
  const [mediaFilter, setMediaFilter] = useState('all');
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
      if (opts.genre && opts.genre !== 'All') params.genre = opts.genre;
      if (!opts.genre || opts.genre === 'All') {
        params.page = opts.page || page;
        params.limit = ITEMS_PER_PAGE;
      }
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

      if (opts.media && opts.media !== 'all') {
        sorted = sorted.filter((s) => s.media_type === opts.media);
      }

      setSongs(sorted);
      setTotalSongs(sorted.length);
    } catch (err) {
      setError('Failed to load songs. Please try again.');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, sortBy, mediaFilter, page]);

  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const searchParam = searchParams.get('search');
    const sortParam = searchParams.get('sort');
    if (genreParam) setSelectedGenre(genreParam);
    if (searchParam) setSearchQuery(searchParam);
    if (sortParam) setSortBy(sortParam);
  }, []);

  useEffect(() => {
    loadSongs({
      search: searchQuery,
      genre: selectedGenre,
      sort: sortBy,
      media: mediaFilter,
      page: 1,
    });
  }, [searchQuery, selectedGenre, sortBy, mediaFilter]);

  const handleGenreSelect = (genre) => {
    setSelectedGenre(genre);
    setPage(1);
    setSearchParams(genre !== 'All' ? { genre } : {});
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    loadSongs({ search: searchQuery, genre: selectedGenre, sort: sortBy, media: mediaFilter, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadSongs({ page: newPage });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setMediaFilter('all');
    setSortBy('popular');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'All' || mediaFilter !== 'all' || sortBy !== 'popular';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search & Filters */}
      <div className="glass-dark rounded-2xl border border-white/10 p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by song, artist, album..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button type="submit" className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold hover:scale-105 transition shrink-0">
            Search
          </button>
        </form>

        {/* Genre Filters */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Genres</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', ...GENRES].map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreSelect(genre)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedGenre === genre
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Media & Sort Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Type:</span>
            {MEDIA_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setMediaFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  mediaFilter === f.value
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-500 hover:text-slate-300 border border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
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

          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="text-xs text-accent-400 hover:text-accent-300 transition ml-auto">
              Clear all filters
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
            {hasActiveFilters ? 'Try adjusting your filters or search query.' : 'No songs have been uploaded yet.'}
          </p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="px-6 py-2 rounded-full bg-primary-500 text-white font-medium hover:bg-primary-600 transition">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-400">
              {totalSongs} song{totalSongs !== 1 ? 's' : ''} found
              {selectedGenre !== 'All' && <span className="text-slate-500"> in <span className="text-slate-300">{selectedGenre}</span></span>}
            </p>
          </div>

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
