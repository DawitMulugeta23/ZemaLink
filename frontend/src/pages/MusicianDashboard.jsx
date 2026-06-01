import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { musicianService } from "../services/musicianService";
import { eventService } from "../services/eventService";
import { liveStreamService } from "../services/liveStreamService";
import CloudinaryUpload from "../components/music/CloudinaryUpload";
import { GENRES, DEFAULT_COVER } from "../constants";
import { getMediaUrl } from "../utils/mediaUrl";

const tabs = [
  { id: "my-songs", label: "My Songs" },
  { id: "upload-song", label: "Upload Song" },
  { id: "events", label: "Events" },
  { id: "live-streams", label: "Live Streams" },
  { id: "earnings", label: "Earnings" },
];

function StatusBadge({ status }) {
  const styles = {
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function MusicianDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my-songs");
  const [songs, setSongs] = useState([]);
  const [events, setEvents] = useState([]);
  const [streams, setStreams] = useState([]);
  const [stats, setStats] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSong, setEditingSong] = useState(null);

  // Upload Song form
  const [uploadForm, setUploadForm] = useState({
    title: "",
    artist: "",
    album: "",
    genre: "Pop",
    description: "",
    lyrics: "",
    is_premium: false,
    price: "0.00",
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCover, setUploadCover] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Event form
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "Virtual (Live Stream)",
    cover_image: "",
    ticket_price: "0.00",
    total_tickets: "100",
    is_live_stream: "0",
  });
  const [editingEvent, setEditingEvent] = useState(null);

  // Stream form
  const [streamForm, setStreamForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    cover_image: "",
    ticket_required: "0",
    ticket_price: "0.00",
    event_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ms, st, er, evRes, strRes] = await Promise.all([
        musicianService.getMySongs(),
        musicianService.getStats(),
        musicianService.getEarnings(),
        eventService.getMusicianEvents(),
        liveStreamService.getMusicianStreams(),
      ]);

      if (ms.success) setSongs(ms.songs || []);
      if (st.success) setStats(st.stats);
      if (er.success) {
        setEarnings(er.earnings || 0);
        setTransactions(er.transactions || []);
      }
      if (evRes.success) setEvents(evRes.events || []);
      if (strRes.success) setStreams(strRes.streams || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load studio data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeSong = async (id) => {
    if (!confirm("Delete this song permanently?")) return;
    const r = await musicianService.deleteSong(id);
    if (r.success) { toast.success("Song deleted"); load(); }
    else toast.error(r.message || "Failed to delete song");
  };

  const handleEditSong = async (e) => {
    e.preventDefault();
    if (!editingSong) return;
    try {
      const res = await musicianService.updateSong(editingSong.id, editingSong);
      if (res.success) {
        toast.success("Song updated");
        setEditingSong(null);
        load();
      } else {
        toast.error(res.message || "Failed to update song");
      }
    } catch (err) {
      toast.error("Error updating song");
    }
  };

  const handleUploadSong = async (e) => {
    e.preventDefault();
    if (!uploadForm.title.trim()) { toast.error("Title is required"); return; }
    if (!uploadFile) { toast.error("Audio/video file is required"); return; }

    setUploading(true);
    setUploadProgress(30);
    try {
      const fd = new FormData();
      fd.append("title", uploadForm.title);
      fd.append("artist", uploadForm.artist);
      fd.append("album", uploadForm.album);
      fd.append("genre", uploadForm.genre);
      fd.append("description", uploadForm.description);
      fd.append("lyrics", uploadForm.lyrics);
      fd.append("is_premium", uploadForm.is_premium ? "1" : "0");
      fd.append("price", uploadForm.is_premium ? uploadForm.price : "0");
      fd.append("file", uploadFile);
      if (uploadCover) fd.append("cover", uploadCover);

      setUploadProgress(60);
      const res = await musicianService.uploadSong(fd);
      if (res.success) {
        setUploadProgress(100);
        toast.success("Song uploaded! Pending approval.");
        setUploadForm({ title: "", artist: "", album: "", genre: "Pop", description: "", lyrics: "", is_premium: false, price: "0.00" });
        setUploadFile(null);
        setUploadCover(null);
        load();
        setTimeout(() => setUploadProgress(0), 1500);
      } else {
        toast.error(res.message || "Upload failed");
        setUploadProgress(0);
      }
    } catch (err) {
      toast.error("Error uploading song");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.event_date) { toast.error("Title and date are required"); return; }
    try {
      const res = editingEvent
        ? await eventService.updateEvent?.(editingEvent.id, eventForm) || { success: false }
        : await eventService.createEvent(eventForm);
      if (res.success) {
        toast.success(editingEvent ? "Event updated!" : "Event created!");
        setEventForm({ title: "", description: "", event_date: "", location: "Virtual (Live Stream)", cover_image: "", ticket_price: "0.00", total_tickets: "100", is_live_stream: "0" });
        setEditingEvent(null);
        load();
      } else {
        toast.error(res.message || "Failed to save event");
      }
    } catch (err) {
      toast.error("Error saving event");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await eventService.deleteEvent(id);
      if (res.success) { toast.success("Event deleted"); load(); }
      else toast.error(res.message || "Failed to delete event");
    } catch (err) { toast.error("Error deleting event"); }
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    if (!streamForm.title || !streamForm.scheduled_at) { toast.error("Title and scheduled date/time are required"); return; }
    try {
      const res = await liveStreamService.createStream(streamForm);
      if (res.success) {
        toast.success("Live stream scheduled!");
        setStreamForm({ title: "", description: "", scheduled_at: "", cover_image: "", ticket_required: "0", ticket_price: "0.00", event_id: "" });
        load();
      } else {
        toast.error(res.message || "Failed to schedule stream");
      }
    } catch (err) { toast.error("Error scheduling stream"); }
  };

  const handleDeleteStream = async (id) => {
    if (!confirm("Delete this stream?")) return;
    try {
      const res = await liveStreamService.deleteStream(id);
      if (res.success) { toast.success("Stream deleted"); load(); }
      else toast.error(res.message || "Failed to delete stream");
    } catch (err) { toast.error("Error deleting stream"); }
  };

  const handleStreamStatus = async (id, status) => {
    try {
      const res = await liveStreamService.updateStreamStatus(id, status);
      if (res.success) { toast.success(`Stream ${status}`); load(); }
      else toast.error(res.message || "Failed to update stream");
    } catch (err) { toast.error("Error updating stream"); }
  };

  const calculateTicketEarnings = () =>
    events.reduce((sum, ev) => sum + (parseFloat(ev.ticket_price) * (ev.tickets_sold || 0)), 0);

  const formatCurrency = (val) => Number(val || 0).toFixed(2);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Musician Studio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Welcome back, {user?.name?.split(" ")[0] || "Musician"}
          </p>
        </div>
        <div className="flex bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg p-1 rounded-full border border-slate-200 dark:border-slate-700/50 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                activeTab === t.id
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Songs</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats?.songs || songs.length}</p>
        </div>
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Plays</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats?.plays || 0}</p>
        </div>
        <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Likes</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats?.likes || 0}</p>
        </div>
        <div className="rounded-2xl bg-purple-500/10 backdrop-blur-lg border border-purple-500/20 p-5 shadow-lg">
          <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Total Earnings</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{formatCurrency(earnings + calculateTicketEarnings())} ETB</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 block mt-1">
            Songs: {formatCurrency(earnings)} | Tickets: {formatCurrency(calculateTicketEarnings())}
          </p>
        </div>
      </div>

      {/* ───── MY SONGS TAB ───── */}
      {activeTab === "my-songs" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Songs</h2>
            <button
              onClick={() => setActiveTab("upload-song")}
              className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition"
            >
              Upload New
            </button>
          </div>

          {songs.length === 0 ? (
            <div className="text-center py-20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-3xl">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No songs uploaded yet. Upload your first track!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/50 text-left text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="p-4">Cover</th>
                    <th className="p-4">Title</th>
                    <th className="p-4 hidden md:table-cell">Genre</th>
                    <th className="p-4 text-center">Plays</th>
                    <th className="p-4 text-center">Likes</th>
                    <th className="p-4 text-center hidden sm:table-cell">Purchases</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4">
                        <img
                          src={s.cover_image && s.cover_image !== "null" ? getMediaUrl(s.cover_image) : DEFAULT_COVER}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={(e) => { e.target.src = DEFAULT_COVER; }}
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.artist}</p>
                      </td>
                      <td className="p-4 hidden md:table-cell text-slate-600 dark:text-slate-300">{s.genre || "—"}</td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-300">{s.plays || 0}</td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-300">{s.likes_count || s.likes || 0}</td>
                      <td className="p-4 text-center hidden sm:table-cell text-slate-600 dark:text-slate-300">{s.purchases || 0}</td>
                      <td className="p-4 text-center">
                        {s.is_approved == 1 ? <StatusBadge status="approved" />
                          : s.is_approved === 0 ? <StatusBadge status="rejected" />
                          : <StatusBadge status="pending" />}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingSong(s)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeSong(s.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Song Modal */}
          {editingSong && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingSong(null)}>
              <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Song</h3>
                <form onSubmit={handleEditSong} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
                      <input type="text" value={editingSong.title}
                        onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Artist</label>
                      <input type="text" value={editingSong.artist}
                        onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Album</label>
                      <input type="text" value={editingSong.album || ""}
                        onChange={(e) => setEditingSong({ ...editingSong, album: e.target.value })}
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Genre</label>
                      <select value={editingSong.genre}
                        onChange={(e) => setEditingSong({ ...editingSong, genre: e.target.value })}
                        className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      >
                        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                    <textarea value={editingSong.description || ""}
                      onChange={(e) => setEditingSong({ ...editingSong, description: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditingSong(null)}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2 text-sm font-semibold text-white"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── UPLOAD SONG TAB ───── */}
      {activeTab === "upload-song" && (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload New Song</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill in the details and upload your audio/video file</p>

            <form onSubmit={handleUploadSong} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title *</label>
                  <input type="text" value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. Midnight Vibes"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Artist</label>
                  <input type="text" value={uploadForm.artist}
                    onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                    placeholder="e.g. Dawit"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Album / EP</label>
                  <input type="text" value={uploadForm.album}
                    onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value })}
                    placeholder="Optional release name"
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Genre</label>
                  <select value={uploadForm.genre}
                    onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                <textarea value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Tell listeners about this track..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lyrics</label>
                <textarea value={uploadForm.lyrics}
                  onChange={(e) => setUploadForm({ ...uploadForm, lyrics: e.target.value })}
                  placeholder="Enter song lyrics..."
                  rows={4}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* File Upload - Drag & Drop */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Audio / Video File *</label>
                <div className="relative">
                  <CloudinaryUpload
                    type="audio"
                    onUploadSuccess={(data) => {
                      setUploadFile(new File([], data.url));
                      setUploadProgress(100);
                    }}
                  />
                  <div className="mt-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-purple-400 transition cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) setUploadFile(f);
                    }}
                  >
                    <input type="file" accept=".mp3,.wav,.m4a,.mp4,.webm,.mov,audio/*,video/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden" id="song-file-input"
                    />
                    <label htmlFor="song-file-input" className="cursor-pointer">
                      <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {uploadFile ? uploadFile.name : "Drag & drop or click to select"}
                      </p>
                      {uploadFile && (
                        <p className="text-xs text-purple-400 mt-1">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Cover Image</label>
                <CloudinaryUpload
                  type="image"
                  onUploadSuccess={(data) => {
                    setUploadCover(data.url);
                  }}
                />
              </div>

              {/* Premium Toggle */}
              <div className="rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Premium Track</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Charge listeners to access this song</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={uploadForm.is_premium}
                      onChange={(e) => setUploadForm({ ...uploadForm, is_premium: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500" />
                  </label>
                </div>
                {uploadForm.is_premium && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Price (ETB)</label>
                    <input type="number" step="0.01" min="0" value={uploadForm.price}
                      onChange={(e) => setUploadForm({ ...uploadForm, price: e.target.value })}
                      className="w-full max-w-xs rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <button type="submit" disabled={uploading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 active:scale-[0.98] transition"
              >
                {uploading ? "Uploading..." : "Upload Song"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ───── EVENTS TAB ───── */}
      {activeTab === "events" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                {editingEvent ? "Edit Event" : "Create Event"}
              </h2>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Title</label>
                  <input type="text" placeholder="Acoustic Live Session" value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Description</label>
                  <textarea placeholder="Tell fans about this show..." value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Date & Time</label>
                    <input type="datetime-local" value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Location</label>
                    <input type="text" value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Cover Image URL</label>
                  <input type="text" placeholder="https://..." value={eventForm.cover_image}
                    onChange={(e) => setEventForm({ ...eventForm, cover_image: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Ticket Price (ETB)</label>
                    <input type="number" step="0.01" value={eventForm.ticket_price}
                      onChange={(e) => setEventForm({ ...eventForm, ticket_price: e.target.value })}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Total Tickets</label>
                    <input type="number" value={eventForm.total_tickets}
                      onChange={(e) => setEventForm({ ...eventForm, total_tickets: e.target.value })}
                      className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ev_is_live" checked={eventForm.is_live_stream === "1"}
                    onChange={(e) => setEventForm({ ...eventForm, is_live_stream: e.target.checked ? "1" : "0" })}
                    className="rounded border-slate-300 dark:border-slate-600 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="ev_is_live" className="text-xs text-slate-600 dark:text-slate-300">Virtual Live Stream Event</label>
                </div>
                <div className="flex gap-2">
                  {editingEvent && (
                    <button type="button" onClick={() => { setEditingEvent(null); setEventForm({ title: "", description: "", event_date: "", location: "Virtual (Live Stream)", cover_image: "", ticket_price: "0.00", total_tickets: "100", is_live_stream: "0" }); }}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-lg hover:shadow-purple-500/20 transition">
                    {editingEvent ? "Update Event" : "Create Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Events</h2>
            {events.length === 0 ? (
              <div className="text-center py-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-2xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No events created yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((ev) => (
                  <div key={ev.id} className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{ev.title}</h3>
                        {ev.is_live_stream == 1 && (
                          <span className="bg-purple-500/20 text-purple-400 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold whitespace-nowrap">Live Stream</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(ev.event_date).toLocaleDateString()} · {new Date(ev.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ev.location}</p>
                      <div className="mt-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Sold:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{ev.tickets_sold || 0} / {ev.total_tickets}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Price:</span>
                          <span className="font-bold text-emerald-500">{parseFloat(ev.ticket_price) === 0 ? "FREE" : `${formatCurrency(ev.ticket_price)} ETB`}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-600 pt-1 mt-1">
                          <span>Revenue:</span>
                          <span className="font-bold text-purple-500">{formatCurrency(parseFloat(ev.ticket_price) * (ev.tickets_sold || 0))} ETB</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                      <button onClick={() => { setEditingEvent(ev); setEventForm({ title: ev.title, description: ev.description || "", event_date: ev.event_date?.slice(0, 16) || "", location: ev.location, cover_image: ev.cover_image || "", ticket_price: String(ev.ticket_price || "0"), total_tickets: String(ev.total_tickets || "100"), is_live_stream: String(ev.is_live_stream || "0") }); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── LIVE STREAMS TAB ───── */}
      {activeTab === "live-streams" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Schedule Stream</h2>
              <form onSubmit={handleCreateStream} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Title</label>
                  <input type="text" placeholder="Album Release Party" value={streamForm.title}
                    onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Description</label>
                  <textarea placeholder="What's this stream about?" value={streamForm.description}
                    onChange={(e) => setStreamForm({ ...streamForm, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Scheduled Date & Time</label>
                  <input type="datetime-local" value={streamForm.scheduled_at}
                    onChange={(e) => setStreamForm({ ...streamForm, scheduled_at: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">Cover Image URL</label>
                  <input type="text" placeholder="https://..." value={streamForm.cover_image}
                    onChange={(e) => setStreamForm({ ...streamForm, cover_image: e.target.value })}
                    className="w-full rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="str_tkt" checked={streamForm.ticket_required === "1"}
                    onChange={(e) => setStreamForm({ ...streamForm, ticket_required: e.target.checked ? "1" : "0" })}
                    className="rounded border-slate-300 dark:border-slate-600 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="str_tkt" className="text-xs text-slate-600 dark:text-slate-300">Require ticket to join</label>
                </div>
                {streamForm.ticket_required === "1" && (
                  <div className="space-y-3 p-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
                    <select value={streamForm.event_id}
                      onChange={(e) => setStreamForm({ ...streamForm, event_id: e.target.value })}
                      className="w-full rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select Event --</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title} ({ev.ticket_price} ETB)</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl py-2.5 text-xs font-bold shadow-lg hover:shadow-purple-500/20 transition"
                >
                  Schedule Stream
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Streams</h2>
            {streams.length === 0 ? (
              <div className="text-center py-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-2xl">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No streams created yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {streams.map((str) => (
                  <div key={str.id} className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded font-extrabold ${
                          str.status === "live"
                            ? "bg-red-500/80 text-white animate-pulse"
                            : str.status === "ended"
                            ? "bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                            : "bg-blue-500/80 text-white"
                        }`}>
                          {str.status}
                        </span>
                        {str.ticket_required == 1 && (
                          <span className="bg-pink-500/20 text-pink-400 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold">Ticket Required</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white mt-2.5">{str.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(str.scheduled_at).toLocaleDateString()} · {new Date(str.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                      <button onClick={() => handleDeleteStream(str.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                      >
                        Delete
                      </button>
                      {str.status === "scheduled" && (
                        <button onClick={() => handleStreamStatus(str.id, "live")}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition"
                        >
                          Start Stream
                        </button>
                      )}
                      {str.status === "live" && (
                        <>
                          <Link to={`/live-streams/${str.id}`}
                            className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                          >
                            Go Live
                          </Link>
                          <button onClick={() => handleStreamStatus(str.id, "ended")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                          >
                            End Stream
                          </button>
                        </>
                      )}
                      {str.status === "ended" && (
                        <Link to={`/live-streams/${str.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          View Replay
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── EARNINGS TAB ───── */}
      {activeTab === "earnings" && (
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-lg border border-purple-500/20 p-6 shadow-lg">
              <p className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Total Earnings</p>
              <p className="text-3xl font-black text-purple-400 mt-2">{formatCurrency(earnings + calculateTicketEarnings())} ETB</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Song Revenue</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{formatCurrency(earnings)} ETB</p>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Ticket Revenue</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{formatCurrency(calculateTicketEarnings())} ETB</p>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Earnings Overview</h3>
            <div className="flex items-end gap-3 h-40">
              {[
                { label: "Jan", value: 0 },
                { label: "Feb", value: 0 },
                { label: "Mar", value: 0 },
                { label: "Apr", value: 0 },
                { label: "May", value: 0 },
                { label: "Jun", value: 15 },
                { label: "Jul", value: 25 },
                { label: "Aug", value: 40 },
                { label: "Sep", value: 60 },
                { label: "Oct", value: 45 },
                { label: "Nov", value: 70 },
                { label: "Dec", value: 100 },
              ].map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-md transition-all duration-500"
                    style={{ height: `${m.value}%` }}
                    title={`${m.label}: ${m.value}%`}
                  />
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 shadow-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700/50">
              <h3 className="font-bold text-slate-900 dark:text-white">Transaction History</h3>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No transactions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700/50 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4">Date</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={tx.id || i} className="border-b border-slate-200/50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4 text-slate-600 dark:text-slate-300">{tx.date ? new Date(tx.date).toLocaleDateString() : "—"}</td>
                        <td className="p-4 text-slate-900 dark:text-white font-medium">{tx.description || tx.song_title || tx.event_title || "—"}</td>
                        <td className="p-4 text-emerald-500 font-semibold">{formatCurrency(tx.amount)} ETB</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            tx.type === "song" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : tx.type === "ticket" ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          }`}>
                            {tx.type || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicianDashboard;
