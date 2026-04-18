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
        className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-red-400/30"
        onClick={handleCardClick}
      >
        <div className="relative rounded-lg overflow-hidden mb-2">
          <img
            src={coverImage}
            alt={song?.title || "Song cover"}
            className={`w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105 ${locked ? "opacity-60" : ""}`}
            onError={(e) => {
              e.target.src = DEFAULT_COVER;
            }}
          />
          {song?.is_premium ? (
            <div className="absolute top-2 left-2">
              <PremiumBadge price={song.price} />
            </div>
          ) : null}
          {locked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-3xl" title="Purchase required">
                🔒
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-3xl text-white">▶</span>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-sm truncate flex items-center gap-1">
          <span className="truncate">{song?.title}</span>
          {song?.is_premium ? <span title="PRO">💎</span> : null}
        </h3>
        <p className="text-xs text-white/50 truncate">{song?.artist}</p>
        <div className="flex justify-between items-center mt-2 text-xs text-white/40">
          <span>❤️ {song?.likes_count || 0}</span>
          <span>▶ {song?.plays || 0}</span>
        </div>
        {user && (
          <button
            type="button"
            onClick={handleReport}
            className="mt-2 text-[10px] text-white/35 hover:text-red-300 underline-offset-2 hover:underline"
          >
            Report
          </button>
        )}
      </div>
  );
}

export default SongCard;
