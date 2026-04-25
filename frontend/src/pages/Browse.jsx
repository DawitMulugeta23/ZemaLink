import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SongCard from "../components/music/SongCard";
import { songService } from "../services/songService";

function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem("recentSearches");
    return saved ? JSON.parse(saved) : [];
  });
  const [filteredRecent, setFilteredRecent] = useState([]);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const data = await songService.getSongs();
      console.log("Loaded songs:", data);
      setSongs(data || []);
    } catch (error) {
      console.error("Error loading songs:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByGenre = async (genre) => {
    setLoading(true);
    try {
      const allSongs = await songService.getSongs();
      console.log("All songs for genre search:", allSongs);
      const filtered = allSongs.filter(
        (song) => song.genre?.toLowerCase() === genre.toLowerCase()
      );
      console.log(`Filtered by genre ${genre}:`, filtered);
      setSongs(filtered);
      setSearchQuery(`Genre: ${genre}`);
    } catch (error) {
      console.error("Genre search error:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  // Check URL params on component mount
  useEffect(() => {
    const genreParam = searchParams.get("genre");
    const searchParam = searchParams.get("search");
    
    if (genreParam) {
      searchByGenre(genreParam);
    } else if (searchParam) {
      setSearchQuery(searchParam);
      performSearch(searchParam);
    } else {
      loadSongs();
    }
  }, [searchParams]);

  const performSearch = async (query) => {
    if (!query.trim()) {
      loadSongs();
      return;
    }

    setLoading(true);
    try {
      const data = await songService.search(query);
      setSongs(data || []);

      // Save to recent searches
      const updated = [
        query,
        ...recentSearches.filter((s) => s !== query),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch (error) {
      console.error("Search error:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadSongs();
      return;
    }
    await performSearch(searchQuery);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery("");
    loadSongs();
  };

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredRecent(recentSearches);
      return;
    }
    setFilteredRecent(
      recentSearches.filter((term) => term.toLowerCase().includes(q))
    );
  }, [searchQuery, recentSearches]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
          Browse Music
        </h1>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by song, artist, album, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-red-500 transition"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:scale-105 transition"
          >
            Search
          </button>
        </div>

        {/* Recent Searches */}
        {searchQuery.trim() !== "" && filteredRecent.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-white/50">Recent:</span>
            {filteredRecent.map((term, i) => (
              <button
                key={i}
                onClick={() => {
                  setSearchQuery(term);
                  setTimeout(() => performSearch(term), 100);
                }}
                className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
              {searchQuery ? `Results for "${searchQuery}"` : "All Songs"}
            </h2>
            <span className="text-sm text-white/50">
              {songs.length} song{songs.length !== 1 ? "s" : ""} found
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/50">
                {searchQuery
                  ? "No songs found. Try a different search."
                  : "No songs available yet."}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-white/70 text-sm"
                >
                  Clear search and show all songs
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {songs.map((song) => (
                <SongCard key={song.id} song={song} onAccessGranted={loadSongs} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Browse;