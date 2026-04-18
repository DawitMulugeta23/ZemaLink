import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { musicianService } from "../services/musicianService";
import SongUpload from "../components/musician/SongUpload";

function MusicianDashboard() {
  const [songs, setSongs] = useState([]);
  const [stats, setStats] = useState(null);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [ms, st, er] = await Promise.all([
      musicianService.getMySongs(),
      musicianService.getStats(),
      musicianService.getEarnings(),
    ]);
    if (ms.success) setSongs(ms.songs || []);
    if (st.success) setStats(st.stats);
    if (er.success) setEarnings(er.earnings || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!confirm("Delete this song?")) return;
    const r = await musicianService.deleteSong(id);
    if (r.success) load();
    else toast.error(r.message || "Failed to delete song");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Musician studio
      </h1>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Songs", stats.songs],
            ["Plays", stats.plays],
            ["Likes", stats.likes],
            ["Purchases", stats.purchases],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4"
            >
              <p className="text-xs text-white/45 uppercase">{k}</p>
              <p className="text-xl font-bold text-white">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 backdrop-blur-md p-4">
        <p className="text-sm text-amber-100/90">
          Mock earnings (premium sales):{" "}
          <span className="font-bold">${Number(earnings).toFixed(2)}</span>
        </p>
      </div>

      <SongUpload onUploaded={load} />

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Your uploads</h2>
        <div className="space-y-2">
          {songs.length === 0 ? (
            <p className="text-white/50">No songs yet.</p>
          ) : (
            songs.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium text-white">{s.title}</p>
                  <p className="text-xs text-white/50">
                    {s.is_approved ? "Live" : "Pending approval"} · Plays {s.plays}
                    {s.is_premium ? " · PRO" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-sm text-red-300 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MusicianDashboard;
