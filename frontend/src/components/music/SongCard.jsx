import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { IMAGE_FALLBACK } from "../../utils/mediaUrl";
import { formatTime } from "../../utils/helpers";
import { songService } from "../../services/songService";
import RatingStars from "./RatingStars";
import SongContextMenu from "./SongContextMenu";
import PremiumBadge from "./PremiumBadge";

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function HeartIcon({ filled, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function MoreIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export default function SongCard({ song, onPlay, showActions = true }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay, likedSongs, toggleLike } = usePlayer();
  const isPremiumUser = user?.subscription_status === 'premium';
  const isOwner = song?.uploader_id && Number(song.uploader_id) === Number(user?.id);
  const isVideo = song?.media_type === 'video';
  const needsPurchase = song?.is_premium && !isPremiumUser && !song?.purchased && !isOwner;
  const [contextMenu, setContextMenu] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const touchTimer = useRef(null);
  const cardRef = useRef(null);

  const isCurrentlyPlaying = currentSong?.id === song?.id && isPlaying;
  const isLiked = song && likedSongs?.some((s) => s.id === song.id);
  const coverUrl = song?.cover_image && song.cover_image !== "null" ? song.cover_image : IMAGE_FALLBACK;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePlay = useCallback(
    (e) => {
      e.stopPropagation();
      if (!user) {
        toast.info("Please log in to play music.");
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (needsPurchase) {
        navigate(`/pro-deal?songId=${song.id}`);
        return;
      }
      if (onPlay) {
        onPlay(song);
      } else {
        playSong({ ...song, can_play: true });
      }
    },
    [user, song, onPlay, playSong, navigate, needsPurchase],
  );

  const handleCardClick = useCallback(() => {
    if (!user) {
      toast.info("Please log in to play music.");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (needsPurchase) {
      navigate(`/pro-deal?songId=${song.id}`);
      return;
    }
    if (isCurrentlyPlaying) {
      togglePlay();
    } else if (onPlay) {
      onPlay(song);
    } else {
      playSong({ ...song, can_play: true });
    }
  }, [user, isCurrentlyPlaying, togglePlay, onPlay, song, playSong, navigate, needsPurchase]);

  const handleLike = useCallback(
    (e) => {
      e.stopPropagation();
      if (!user) {
        toast.info("Please log in to like songs.");
        return;
      }
      toggleLike(song.id);
    },
    [user, song, toggleLike],
  );

  const handleReport = useCallback(
    (e) => {
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
    },
    [user, song],
  );

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, [user]);

  const handleTouchStart = useCallback((e) => {
    if (!user) return;
    const touch = e.touches[0];
    touchTimer.current = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY });
    }, 600);
  }, [user]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
  }, []);

  useEffect(() => {
    return () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
    };
  }, []);

  if (!song) return null;

  return (
    <>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex flex-col rounded-2xl border border-surface-200 dark:border-surface-700/40 bg-white/70 dark:bg-surface-800/50 backdrop-blur-xl p-3 sm:p-4 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary-400/30 dark:hover:border-primary-500/30 hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer ${
          isVisible ? "animate-scale-in" : "opacity-0"
        }`}
        onClick={handleCardClick}
      >
        {/* Cover Image */}
        <div className="relative mb-3 overflow-hidden rounded-xl aspect-square bg-surface-100 dark:bg-surface-700">
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          )}
          {isVisible && (
            <img
              src={coverUrl}
              alt={song.title || "Song cover"}
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-500 ${
                imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } group-hover:scale-105`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                setImgError(true);
                setImgLoaded(true);
                e.target.src = "/assets/images/default-cover.svg";
              }}
            />
          )}

          {/* Duration badge */}
          {song.duration > 0 && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white tabular-nums flex items-center gap-1">
              <ClockIcon className="w-2.5 h-2.5" />
              {formatTime(song.duration)}
            </div>
          )}

          {/* Video badge */}
          {isVideo && (
            <div className="absolute top-1.5 left-1.5">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Video
              </span>
            </div>
          )}

          {/* Premium badge */}
          {song.is_premium && (
            <div className="absolute top-1.5 right-1.5">
              <PremiumBadge size="sm" />
            </div>
          )}

          {/* Playing indicator */}
          {isCurrentlyPlaying && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 shadow-lg shadow-primary-500/50 flex items-center justify-center">
              <div className="flex items-center gap-px">
                <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0s" }} />
                <span className="w-0.5 h-3 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0.15s" }} />
                <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}

          {/* Hover overlay with play button */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl">
            <button
              onClick={handlePlay}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-glow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white translate-y-2 group-hover:translate-y-0"
              aria-label={isCurrentlyPlaying ? "Pause" : "Play"}
            >
              {isCurrentlyPlaying ? (
                <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Song Info */}
        <h3 className="font-semibold text-sm text-surface-800 dark:text-white truncate mb-0.5 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" title={song.title}>
          {song.title}
        </h3>
        <p className="text-xs text-surface-500 dark:text-surface-400 truncate mb-2" title={song.artist}>
          {song.artist}
        </p>

        {/* Rating */}
        <div className="mt-auto mb-2">
          <RatingStars rating={song.rating || 0} size="sm" />
        </div>

        {/* Actions bar */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-100 dark:border-surface-700/30">
            {/* Stats */}
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-surface-400 tabular-nums">
              {(song.plays > 0 || song.plays_count > 0) && (
                <span>{song.plays || song.plays_count || 0} plays</span>
              )}
              {(song.likes_count > 0) && (
                <span className="flex items-center gap-0.5">
                  <HeartIcon filled={false} className="w-2.5 h-2.5" />
                  {song.likes_count}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              {user && (
                <button
                  onClick={handleLike}
                  className={`p-1.5 rounded-full transition-all duration-200 ${
                    isLiked
                      ? "text-accent-500 hover:text-accent-600 scale-110"
                      : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:scale-110"
                  }`}
                  aria-label={isLiked ? "Unlike" : "Like"}
                >
                  <HeartIcon filled={isLiked} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              {user && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e);
                  }}
                  className="p-1.5 rounded-full text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-all duration-200 hover:scale-110"
                  aria-label="More options"
                >
                  <MoreIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <SongContextMenu
          song={song}
          position={contextMenu}
          isOpen={!!contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
