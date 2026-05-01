import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SongCard from "../components/music/SongCard";
import { useAuth } from "../context/AuthContext";
import { songService } from "../services/songService";

function Library() {
  const { user } = useAuth();
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState("liked");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const [likes, playlistsData, hist] = await Promise.all([
        songService.getLikes(),
        songService.getPlaylists(),
        songService.getListeningHistory(),
      ]);
      setLikedSongs(likes.likes || []);
      setPlaylists(playlistsData.playlists || []);
      setHistory(hist || []);
    } catch (error) {
      console.error("Error loading library:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistName.trim()) return;

    setCreating(true);
    try {
      const result = await songService.createPlaylist(playlistName.trim());
      if (result.success) {
        setPlaylistName("");
        setShowCreateModal(false);
        // Refresh playlists
        const playlistsData = await songService.getPlaylists();
        setPlaylists(playlistsData.playlists || []);
      } else {
        alert("Failed to create playlist: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      alert("Failed to create playlist");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLibrary();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
        <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
          Login Required
        </h2>
        <p className="text-white/50">Sign in to view your library</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-red-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
        Your Library
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("liked")}
          className={`px-6 py-2 rounded-full transition ${
            activeTab === "liked"
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          ❤️ Liked Songs
        </button>
        <button
          onClick={() => setActiveTab("playlists")}
          className={`px-6 py-2 rounded-full transition ${
            activeTab === "playlists"
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          📋 Playlists
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-6 py-2 rounded-full transition ${
            activeTab === "history"
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
              : "text-white/60 hover:text-white"
          }`}
        >
          🕐 History
        </button>
        <Link
          to="/purchased"
          className="px-6 py-2 rounded-full text-white/60 hover:text-white border border-white/15"
        >
          💎 Purchased
        </Link>
      </div>

      {/* Liked Songs Tab */}
      {activeTab === "liked" && (
        <>
          {likedSongs.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/50">
                No liked songs yet. Start liking some music!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {likedSongs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <>
          {history.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/50">No listening history yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {history.map((song) => (
                <SongCard key={`${song.id}-${song.played_at}`} song={song} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Playlists Tab */}
      {activeTab === "playlists" && (
        <>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="mb-6 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm hover:bg-white/20 transition"
          >
            + Create New Playlist
          </button>
          {playlists.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/50">
                No playlists yet. Create your first playlist!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 cursor-pointer hover:scale-105 transition"
                >
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                    <span className="text-4xl">📋</span>
                  </div>
                  <h3 className="font-semibold truncate">{playlist.name}</h3>
                  <p className="text-xs text-white/50">
                    {playlist.song_count || 0} songs
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Create Playlist Modal */}
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
            onClick={() => setShowCreateModal(false)}
          />
          
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-md z-50">
            <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
              Create New Playlist
            </h2>
            
            <form onSubmit={handleCreatePlaylist}>
              <div className="mb-4">
                <label htmlFor="playlistName" className="block text-sm font-medium text-white/80 mb-2">
                  Playlist Name
                </label>
                <input
                  type="text"
                  id="playlistName"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-red-400"
                  placeholder="Enter playlist name..."
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/80 hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !playlistName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg text-white font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default Library;
