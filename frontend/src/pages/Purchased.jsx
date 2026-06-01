import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { songService } from "../services/songService";
import { DEFAULT_COVER } from "../constants";
import { getMediaUrl } from "../utils/mediaUrl";

function Purchased() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    (async () => {
      try {
        const list = await songService.getPurchasedSongs();
        setSongs(list.map((s) => ({ ...s, can_play: true })));
      } catch (err) {
        console.error("Failed to load purchased songs:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isCurrentSong = (id) => currentSong?.id === id && isPlaying;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Purchased Songs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Songs you've bought — all yours to keep</p>
        </div>
      </div>

      {songs.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 rounded-3xl">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No purchases yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Browse premium songs and start your collection</p>
          <Link to="/browse?filter=premium"
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-sm shadow-lg hover:shadow-emerald-500/25 active:scale-95 transition"
          >
            Browse Premium Songs
          </Link>
        </div>
      ) : (
        /* Song Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {songs.map((s) => {
            const cover = s.cover_image && s.cover_image !== "null" ? getMediaUrl(s.cover_image) : DEFAULT_COVER;
            return (
              <div key={s.id}
                className="group relative flex flex-col rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200 dark:border-slate-700/50 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Cover */}
                <div className="relative mb-3 overflow-hidden rounded-xl">
                  <img src={cover} alt={s.title}
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => { e.target.src = DEFAULT_COVER; }}
                  />
                  {/* Purchased Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white shadow-lg">
                      Purchased
                    </span>
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                    <button onClick={() => playSong({ ...s, can_play: true })}
                      className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/30 hover:scale-110 transition"
                    >
                      {isCurrentSong(s.id) ? "⏸" : "▶"}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{s.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{s.artist}</p>

                {/* Stats */}
                <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{s.plays || 0} plays</span>
                  <span>❤️ {s.likes_count || s.likes || 0}</span>
                </div>

                {/* Download Button */}
                {s.file_path && (
                  <a href={getMediaUrl(s.file_path)} download
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Purchased;
