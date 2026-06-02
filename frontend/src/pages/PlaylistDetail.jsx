import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { api } from "../services/api";
import { playlistService } from "../services/playlistService";
import { songService } from "../services/songService";
import { DEFAULT_COVER } from "../constants";

function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [addingSongId, setAddingSongId] = useState(null);

  const loadPlaylist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`playlists/${id}`);
      if (res.success && res.playlist) {
        setPlaylist(res.playlist);
        const plSongs = await playlistService.getPlaylistSongs(id);
        setSongs(Array.isArray(plSongs) ? plSongs : []);
      } else {
        toast.error("Playlist not found");
        navigate("/playlists");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load playlist");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong({ ...songs[0], can_play: true });
    navigate("/player");
  };

  const handleRemoveSong = async (songId) => {
    try {
      const res = await playlistService.removeSongFromPlaylist(id, songId);
      if (res.success) {
        toast.success("Song removed");
        setSongs((prev) => prev.filter((s) => String(s.id) !== String(songId)));
      } else {
        toast.error(res.error || "Failed to remove song");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const handleDragStart = (index) => setDraggedIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...songs];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);
    setSongs(reordered);
    setDraggedIndex(null);
    toast.success("Playlist reordered!");
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const reordered = [...songs];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setSongs(reordered);
  };

  const handleMoveDown = (index) => {
    if (index === songs.length - 1) return;
    const reordered = [...songs];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setSongs(reordered);
  };

  const handleSearchSongs = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const allSongs = await songService.getSongs({ search: q });
      const playlistSongIds = new Set(songs.map((s) => String(s.id)));
      setSearchResults((allSongs || []).filter((s) => !playlistSongIds.has(String(s.id))));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddSong = async (songId) => {
    setAddingSongId(songId);
    try {
      const res = await playlistService.addSongToPlaylist(id, songId);
      if (res.success) {
        toast.success("Song added!");
        setSearchQuery("");
        setSearchResults([]);
        setShowAddSongs(false);
        loadPlaylist();
      } else {
        toast.error(res.error || "Failed to add song");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setAddingSongId(null);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm("Delete this playlist permanently? This cannot be undone.")) return;
    try {
      const res = await playlistService.deletePlaylist(id);
      if (res.success) {
        toast.success("Playlist deleted");
        navigate("/playlists");
      } else {
        toast.error(res.error || "Failed to delete playlist");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }
  };

  const isOwner = user && playlist && String(playlist.user_id) === String(user.id);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-white/5 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="max-w-md mx-auto my-12 text-center rounded-3xl glass-dark p-8">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Playlist not found</h2>
        <p className="text-slate-400 mb-6">This playlist might have been deleted or doesn't exist.</p>
        <Link to="/playlists" className="inline-flex rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition">
          Back to Playlists
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-4">
      <div className="rounded-3xl glass-dark p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary-500/15 via-accent-500/8 to-transparent blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center text-5xl shadow-2xl shadow-primary-500/25 text-white shrink-0 overflow-hidden">
            {playlist.cover_image ? (
              <img src={playlist.cover_image} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <span>📋</span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">PLAYLIST</span>
              {(playlist.is_public === 1 || playlist.is_public === "1") && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                  Public
                </span>
              )}
              {(playlist.is_public === 0 || playlist.is_public === "0") && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-semibold">
                  Private
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mt-1 mb-2 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              {playlist.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-slate-400 mt-2 font-medium">
              <span>{songs.length} song{songs.length !== 1 ? "s" : ""}</span>
              {isOwner && (
                <>
                  <span className="text-white/20">•</span>
                  <span>Created by you</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary-500/25 hover:opacity-90 transition disabled:opacity-40"
              >
                ▶ Play All
              </button>
              <button
                onClick={() => setShowAddSongs(!showAddSongs)}
                className="rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                + Add Songs
              </button>
              {isOwner && (
                <button
                  onClick={handleDeletePlaylist}
                  className="rounded-full bg-red-600/20 border border-red-500/20 px-5 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-600/30 transition"
                >
                  Delete Playlist
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddSongs && (
        <div className="rounded-3xl glass-dark p-5 mb-8">
          <h3 className="text-sm font-bold text-white mb-3">Add Songs from Library</h3>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search songs by title or artist..."
              value={searchQuery}
              onChange={(e) => handleSearchSongs(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          </div>
          {searching && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <div className="w-4 h-4 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin" />
              Searching...
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scroll">
              {searchResults.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition group">
                  <img
                    src={s.cover_image || DEFAULT_COVER}
                    alt={s.title}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => { e.target.src = DEFAULT_COVER; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                    <p className="text-xs text-slate-400 truncate">{s.artist}</p>
                  </div>
                  <button
                    onClick={() => handleAddSong(s.id)}
                    disabled={addingSongId === s.id}
                    className="shrink-0 rounded-full bg-purple-600/20 border border-purple-500/20 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition disabled:opacity-50"
                  >
                    {addingSongId === s.id ? "..." : "+ Add"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchQuery && !searching && searchResults.length === 0 && (
            <p className="text-xs text-slate-500 py-2 text-center">No matching songs found.</p>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Tracks</h2>
          <p className="text-slate-500 text-xs mt-0.5">Drag to reorder or use the arrow buttons.</p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="rounded-3xl glass-dark p-12 text-center max-w-xl mx-auto">
          <div className="text-5xl mb-4">🎵</div>
          <h3 className="text-lg font-bold text-white mb-2">This playlist is empty</h3>
          <p className="text-slate-400 text-sm mb-6">
            Search for songs in our catalog and add them to this playlist!
          </p>
          <button
            onClick={() => setShowAddSongs(true)}
            className="rounded-full bg-gradient-to-r from-primary-600 to-accent-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition"
          >
            + Add Songs
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, index) => (
            <div
              key={song.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              className={`flex items-center gap-3 p-3 rounded-2xl glass-dark transition ${
                draggedIndex === index ? "opacity-40 border-dashed border-2 border-purple-500" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === songs.length - 1}
                  className="p-0.5 text-slate-500 hover:text-white disabled:opacity-30 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <img
                src={song.cover_image || DEFAULT_COVER}
                alt={song.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
                onError={(e) => { e.target.src = DEFAULT_COVER; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{song.title}</p>
                <p className="text-xs text-slate-400 truncate">{song.artist}</p>
              </div>
              <button
                onClick={() => handleRemoveSong(song.id)}
                className="shrink-0 p-2 text-slate-500 hover:text-red-400 transition"
                title="Remove from playlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlaylistDetail;
