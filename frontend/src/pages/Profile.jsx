import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { songService } from "../services/songService";
import { api } from "../services/api";
import { getInitials } from "../utils/helpers";

function Profile() {
  const { user, isPremium, updateProfile, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [stats, setStats] = useState({ likes: 0, playlists: 0, listeningTime: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditBio(user.bio || "");
      setEditGenre(user.genre || "");
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const [likesRes, plRes] = await Promise.all([
        songService.getLikes().catch(() => ({ likes: [] })),
        songService.getPlaylists().catch(() => ({ playlists: [] })),
      ]);
      setStats({
        likes: (likesRes.likes || []).length,
        playlists: (plRes.playlists || []).length,
        listeningTime: 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.warning("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({
        name: editName.trim(),
        bio: editBio.trim(),
        genre: editGenre.trim(),
      });
      if (res.success) {
        toast.success("Profile updated!");
        setEditing(false);
        refreshUser();
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="rounded-3xl glass-dark p-12 max-w-md mx-auto">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2 text-white">Login Required</h2>
          <p className="text-slate-400">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const initials = getInitials(user.name);

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="rounded-3xl glass-dark overflow-hidden shadow-2xl">
        <div className="h-40 md:h-52 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 relative">
          <div className="absolute inset-0 bg-black/10" />
          {isPremium && (
            <div className="absolute top-4 right-4 z-10">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg">
                ⭐ Premium
              </span>
            </div>
          )}
        </div>

        <div className="px-6 md:px-8 pb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 sm:-mt-16 mb-6 relative z-10">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-surface-900 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-xl shrink-0">
              {initials}
            </div>
            <div className="text-center sm:text-left flex-1 pt-2 sm:pt-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{user.name}</h1>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold capitalize border border-purple-500/20">
                  {user.role}
                </span>
                {isPremium && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20">
                    Premium
                  </span>
                )}
                {!isPremium && (
                  <Link to="/subscription" className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:opacity-90 transition">
                    Upgrade
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="shrink-0 rounded-full bg-white/5 border border-white/10 px-5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          {editing && (
            <form onSubmit={handleSave} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 mb-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              </div>
              {user.role === "musician" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Genre</label>
                  <input
                    type="text"
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    placeholder="e.g. Afrobeat, Jazz, Pop"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {!editing && user.bio && (
            <div className="mb-6">
              <p className="text-slate-300 text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          <div className={`grid gap-3 md:gap-4 mb-6 ${user?.role === 'musician' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
              <div className="text-2xl font-bold gradient-text">
                {loadingStats ? "..." : stats.likes}
              </div>
              <div className="text-xs text-slate-400 mt-1">Songs Liked</div>
            </div>
            {user?.role === 'musician' && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                <div className="text-2xl font-bold gradient-text">
                  {loadingStats ? "..." : stats.playlists}
                </div>
                <div className="text-xs text-slate-400 mt-1">Playlists</div>
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
              <div className="text-2xl font-bold gradient-text">
                {stats.listeningTime > 0 ? `${Math.round(stats.listeningTime / 60)}h` : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-1">Listening Time</div>
            </div>
          </div>

          {!isPremium && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-300">Upgrade to Premium</p>
                <p className="text-xs text-slate-400 mt-1">Unlock unlimited skips, high-quality audio, and more.</p>
              </div>
              <Link
                to="/subscription"
                className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition shadow-lg shadow-amber-500/20"
              >
                View Plans
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
