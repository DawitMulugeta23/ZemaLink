import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { DEFAULT_COVER } from "../../constants";
import PremiumBadge from "./PremiumBadge";
import { songService } from "../../services/songService";

function SongCard({ song }) {
  const { playSong } = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();

  const coverImage =
    song?.cover_image && song.cover_image !== "null" && song.cover_image !== ""
      ? song.cover_image
      : DEFAULT_COVER;

  const locked = !!song?.is_premium && song?.can_play === false;

  const handleCardClick = () => {
    if (locked) {
      if (!user) {
        toast.info("Please log in to purchase this track.");
        return;
      }
      navigate(`/pro-deal?songId=${song.id}`);
      return;
    }
    playSong(song);
  };

  const handleReport = (e) => {
    e.stopPropagation();
    if (!user) {
      toast.info("Log in to report content.");
      return;
    }
    const reason = window.prompt("Describe the issue:");
    if (reason?.trim()) {
      songService.reportSong(song.id, reason.trim());
      toast.success("Report submitted. Thank you.");
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      className="group relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-red-400/35 hover:shadow-xl hover:shadow-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400/60"
      onClick={handleCardClick}
    >
      <div className="relative mb-3 overflow-hidden rounded-xl ring-1 ring-white/10">
        <img
          src={coverImage}
          alt={song?.title || "Song cover"}
          className={`aspect-square w-full object-cover transition duration-300 ease-out group-hover:scale-[1.04] ${locked ? "opacity-55" : ""}`}
          onError={(e) => {
            e.target.src = DEFAULT_COVER;
          }}
        />
        {song?.is_premium ? (
          <div className="absolute left-2 top-2 z-10">
            <PremiumBadge price={song.price} />
          </div>
        ) : null}
        {locked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span
              className="text-3xl drop-shadow-lg"
              title="Purchase required"
              aria-hidden
            >
              🔒
            </span>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-105"
              aria-hidden
            >
              ▶
            </span>
          </div>
        )}
      </div>

      <h3 className="mb-0.5 flex min-h-[1.25rem] items-center gap-1 text-sm font-semibold leading-tight text-white">
        <span className="truncate" title={song?.title}>
          {song?.title}
        </span>
        {song?.is_premium ? (
          <span className="shrink-0 text-base" title="Premium track">
            💎
          </span>
        ) : null}
      </h3>
      <p
        className="mb-2 truncate text-xs text-white/55"
        title={song?.artist}
      >
        {song?.artist}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1.5 text-[11px] font-medium tabular-nums text-white/50 ring-1 ring-white/5">
        <span className="inline-flex items-center gap-1">
          <span className="text-red-300/90" aria-hidden>
            ♥
          </span>
          <span>{song?.likes_count ?? 0}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-emerald-300/80" aria-hidden>
            ▶
          </span>
          <span>{song?.plays ?? 0}</span>
        </span>
      </div>

      {user ? (
        <button
          type="button"
          onClick={handleReport}
          className="mt-2 w-full rounded-lg border border-transparent py-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/35 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-200/90"
        >
          Report
        </button>
      ) : null}
    </div>
  );
}

export default SongCard;
