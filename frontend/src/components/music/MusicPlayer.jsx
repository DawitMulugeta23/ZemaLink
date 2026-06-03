import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { getMediaUrl } from "../../utils/mediaUrl";
import { formatTime } from "../../utils/helpers";
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

function SkipPrevIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function SkipNextIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
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

function VolumeIcon({ muted, low, className }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d={low ? "M15.54 8.46a5 5 0 010 7.07" : "M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"} />
    </svg>
  );
}

function QueueIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 6v6l4 2" />
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  );
}

function ShuffleIcon({ active, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function LoopIcon({ active, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function MaximizeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  );
}

export default function MusicPlayer() {
  const { user, isAuthenticated } = useAuth();
  const {
    currentSong,
    isPlaying,
    togglePlay,
    nextSong,
    prevSong,
    likedSongs,
    toggleLike,
    currentTime,
    duration,
    seekTo,
    queue,
    volume,
    muted,
    loop,
    shuffle,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    playSong,
  } = usePlayer();

  const [expanded, setExpanded] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef(null);
  const prevSongRef = useRef(null);

  const isLiked = currentSong && likedSongs?.some((s) => s.id === currentSong.id);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (currentSong?.id !== prevSongRef.current) {
      prevSongRef.current = currentSong?.id;
    }
  }, [currentSong]);

  const handleSeek = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      seekTo(pct * duration);
    },
    [duration, seekTo],
  );

  const handleVolumeChange = useCallback(
    (e) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(Math.min(duration, currentTime + 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
      }
    },
    [togglePlay, seekTo, currentTime, duration, setVolume, volume, toggleMute],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!currentSong) return null;

  const coverUrl = getMediaUrl(currentSong.cover_image);
  const isVideo = currentSong?.media_type === "video";

  return (
    <div className="fixed left-0 top-14 bottom-0 z-50 flex flex-col w-20 lg:w-[72px] glass dark:glass-dark border-r border-primary-500/20 dark:border-primary-500/10 shadow-2xl shadow-primary-500/5 py-3 items-center gap-2">
      {/* Cover art */}
      <Link to="/player" className="relative flex-shrink-0 group">
        <img
          src={coverUrl}
          alt={currentSong.title}
          className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10 shadow-lg"
          onError={(e) => { e.target.src = "/assets/images/default-cover.svg"; }}
        />
        <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <MaximizeIcon className="w-4 h-4 text-white" />
        </div>
        {isPlaying && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary-500 rounded-full border-2 border-white dark:border-surface-900 flex items-center justify-center">
            <div className="flex items-center gap-px">
              <span className="w-0.5 h-2 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0s" }} />
              <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0.15s" }} />
              <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse-waveform" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
      </Link>

      {/* Song info (truncated) */}
      <div className="w-full px-1 text-center min-w-0">
        <p className="text-[10px] font-semibold text-surface-800 dark:text-white truncate leading-tight">{currentSong.title}</p>
        <p className="text-[8px] text-surface-500 dark:text-surface-400 truncate">{currentSong.artist}</p>
      </div>

      {/* Progress bar (vertical strip) */}
      <div
        className="relative w-1 flex-1 max-h-24 rounded-full bg-surface-200 dark:bg-surface-700 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const pct = Math.max(0, Math.min(1, y / rect.height));
          seekTo(pct * duration);
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-primary-500 via-primary-400 to-accent-500 transition-all duration-100 ease-linear"
          style={{ height: `${progress}%` }}
        />
      </div>

      {/* Time */}
      <div className="text-[8px] tabular-nums text-surface-400 text-center leading-none">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Control buttons */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          onClick={prevSong}
          className="p-1 text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors rounded-full hover:bg-surface-100 dark:hover:bg-surface-700"
          aria-label="Previous song"
        >
          <SkipPrevIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={togglePlay}
          className="p-1.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 transition-all"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
        </button>
        <button
          onClick={nextSong}
          className="p-1 text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors rounded-full hover:bg-surface-100 dark:hover:bg-surface-700"
          aria-label="Next song"
        >
          <SkipNextIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions row */}
      <div className="flex flex-col items-center gap-1">
        {isAuthenticated && (
          <button
            onClick={() => toggleLike(currentSong.id)}
            className={`p-1 rounded-full transition-colors ${
              isLiked ? "text-accent-500" : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <HeartIcon filled={isLiked} className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={toggleMute}
          className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <VolumeIcon muted={muted} low={volume < 0.5} className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={toggleLoop}
          className={`p-1 rounded-full transition-colors ${
            loop ? "text-primary-500 bg-primary-500/10" : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
          }`}
          aria-label={loop ? "Loop on" : "Loop off"}
        >
          <LoopIcon active={loop} className="w-3 h-3" />
        </button>
        <button
          onClick={toggleShuffle}
          className={`p-1 rounded-full transition-colors ${
            shuffle ? "text-primary-500 bg-primary-500/10" : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
          }`}
          aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
        >
          <ShuffleIcon active={shuffle} className="w-3 h-3" />
        </button>
      </div>

      {/* Queue count */}
      <Link
        to="/player"
        className="relative p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors rounded-full"
        aria-label="Queue"
      >
        <QueueIcon className="w-3.5 h-3.5" />
        {queue.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary-500 text-[7px] font-bold text-white flex items-center justify-center shadow-lg">
            {queue.length > 9 ? "9+" : queue.length}
          </span>
        )}
      </Link>
    </div>
  );
}
