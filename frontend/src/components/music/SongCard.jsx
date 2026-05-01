import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { DEFAULT_COVER } from "../../constants";
import PremiumBadge from "./PremiumBadge";
import { songService } from "../../services/songService";
import RatingStars from "./RatingStars";

function SongCard({ song }) {
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();
  const { user } = useAuth();

  const coverImage =
    song?.cover_image && song.cover_image !== "null" && song.cover_image !== ""
      ? song.cover_image
      : DEFAULT_COVER;

  // Check if song is premium and user hasn't purchased it
  const isPremium = song?.is_premium === 1;
  // Check if user has access (premium subscription or purchased)
  const hasAccess = song?.can_play === true || 
                    (user?.subscription_status === 'premium') ||
                    song?.purchased === true;
  
  // Song is locked if premium AND user doesn't have access
  const locked = isPremium && !hasAccess;

  const handleCardClick = async () => {
    if (!user) {
      toast.info("Please log in to play music.");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // If premium and locked, redirect to payment
    if (locked) {
      navigate(`/pro-deal?songId=${song.id}`);
      return;
    }
    
    // Check if it's the same song that's already playing
    if (currentSong?.id === song.id && isPlaying) {
      togglePlay();
      return;
    }
    
    // Free song or already purchased - play it
    playSong({ ...song, can_play: true });
    navigate("/player");
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

  // Check if this specific song is currently playing
  const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      className={`group relative flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-3 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-red-400/35 hover:shadow-xl hover:shadow-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400/60 ${
        locked ? "cursor-pointer" : "cursor-pointer"
      }`}
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
        {isPremium ? (
          <div className="absolute left-2 top-2 z-10">
            <PremiumBadge price={song?.price} />
          </div>
        ) : null}
        
        {/* Lock overlay for premium songs without access */}
        {locked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 backdrop-blur-[2px]">
            <span className="text-3xl drop-shadow-lg" title="Purchase required" aria-hidden>
              🔒
            </span>
            <span className="text-[10px] text-white/80 font-medium">Premium</span>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {isCurrentlyPlaying ? (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl text-white shadow-lg backdrop-blur-sm"
                aria-hidden
              >
                ⏸
              </span>
            ) : (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 text-2xl text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-105"
                aria-hidden
              >
                ▶
              </span>
            )}
          </div>
        )}
      </div>

      <h3 className="mb-0.5 flex min-h-[1.25rem] items-center gap-1 text-sm font-semibold leading-tight text-white">
        <span className="truncate" title={song?.title}>
          {song?.title}
        </span>
        {isPremium && !locked && (
          <span className="shrink-0 text-base" title="Premium track (purchased)">
            💎
          </span>
        )}
        {isPremium && locked && (
          <span className="shrink-0 text-base" title="Premium track (locked)">
            🔒
          </span>
        )}
      </h3>
      <p
        className="mb-2 truncate text-xs text-white/55"
        title={song?.artist}
      >
        {song?.artist}
      </p>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-white/45">
        {song?.media_type === "video" ? "Video" : "Audio"}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1.5 text-[11px] font-medium tabular-nums text-white/50 ring-1 ring-white/5">
        <span className="inline-flex items-center gap-1">
          <span className="text-red-300/90" aria-hidden>❤️</span>
          <span>{song?.likes_count ?? 0}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-emerald-300/80" aria-hidden>👁️</span>
          <span>{song?.plays?.toLocaleString() ?? 0}</span>
        </span>
      </div>

      <div className="mt-2">
        <RatingStars 
          songId={song.id} 
          rating={song?.rating || 0}
          likesCount={song?.likes_count || 0}
          playsCount={song?.plays || 0}
        />
      </div>

      {user && !locked && (
        <button
          type="button"
          onClick={handleReport}
          className="mt-2 w-full rounded-lg border border-transparent py-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/35 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-200/90"
        >
          Report
        </button>
      )}
      
      {locked && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/pro-deal?songId=${song.id}`);
          }}
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-500/80 to-orange-500/80 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-white transition hover:scale-105"
        >
          💎 Unlock for ${Number(song?.price || 0.99).toFixed(2)}
        </button>
      )}
    </div>
  );
}

export default SongCard;