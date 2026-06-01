import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { playlistService } from "../services/playlistService";
import { DEFAULT_COVER } from "../constants";

function Playlists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const res = await playlistService.getPlaylists();
      if (res.success) {
        setPlaylists(res.playlists || []);
      }
    } catch (err) {
      console.error("Error loading playlists:", err);
      toast.error("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadPlaylists();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.warning("Playlist name cannot be empty");
      return;
    }
    setCreating(true);
    try {
      const res = await playlistService.createPlaylist({
        name: newName.trim(),
        is_public: isPublic ? 1 : 0,
      });
      if (res.success) {
        toast.success("Playlist created!");
        setNewName("");
        setIsPublic(true);
        setModalOpen(false);
        loadPlaylists();
      } else {
        toast.error(res.error || "Failed to create playlist");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await playlistService.deletePlaylist(deleteTarget);
      if (res.success) {
        toast.success("Playlist deleted");
        setDeleteTarget(null);
        loadPlaylists();
      } else {
        toast.error(res.error || "Failed to delete playlist");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 text-center glass-card p-8">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2 text-white">Please log in</h2>
        <p className="text-slate-400 mb-6">You need to be logged in to view your playlists.</p>
        <Link to="/login" className="inline-flex rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:scale-[1.01] transition">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            My Playlists
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create, view, and organize your collection of custom vibes.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:scale-[1.01] transition duration-300"
        >
          ✦ Create Playlist
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-white/[0.08] bg-[#13131f] p-4 animate-pulse">
              <div className="aspect-square w-full bg-white/5 rounded-2xl mb-4" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#13131f] p-12 text-center max-w-xl mx-auto">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-white mb-2">No playlists yet</h3>
          <p className="text-slate-400 text-sm mb-6">
            Get started by creating your first custom playlist. You can then add songs directly from context menus!
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {playlists.map((pl) => {
            const cover = pl.cover_image || DEFAULT_COVER;
            return (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="group relative flex flex-col rounded-3xl border border-white/[0.08] bg-[#13131f] p-4 shadow-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-500/40 hover:shadow-purple-500/25 cursor-pointer"
              >
                <div className="relative mb-4 overflow-hidden rounded-2xl ring-1 ring-white/5 aspect-square">
                  <img
                    src={cover}
                    alt={pl.name}
                    className="w-full h-full object-cover transition duration-300 ease-out group-hover:scale-[1.04]"
                    onError={(e) => { e.target.src = DEFAULT_COVER; }}
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(pl.id); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600/90 rounded-full text-white/80 hover:text-white transition duration-200 opacity-0 group-hover:opacity-100 z-10"
                    title="Delete playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  {(pl.is_public === 1 || pl.is_public === "1") && (
                    <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/80 text-white backdrop-blur-md font-semibold">
                      Public
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold leading-tight text-white truncate block">
                  {pl.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {pl.song_count || 0} song{(pl.song_count || 0) !== 1 ? "s" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="rounded-3xl border border-white/[0.08] bg-[#13131f] w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => { setModalOpen(false); setNewName(""); setIsPublic(true); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg transition"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              ✦ Create Playlist
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Give your new playlist a name and set its visibility.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Playlist Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chill Late Nights, Workout Beats..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 transition text-sm"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visibility</span>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    isPublic ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    !isPublic ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-400 border border-white/10"
                  }`}
                >
                  Private
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setNewName(""); setIsPublic(true); }}
                  className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Playlist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="rounded-3xl border border-white/[0.08] bg-[#13131f] w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Playlist?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone. All songs will be removed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2 rounded-full border border-white/5 bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Playlists;
