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
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          expanded ? "translate-y-0" : ""
        }`}
      >
        {/* Main bar */}
        <div className="glass dark:glass-dark border-t border-primary-500/20 dark:border-primary-500/10 shadow-2xl shadow-primary-500/5">
          <div className="max-w-screen-2xl mx-auto px-2 sm:px-4">
            {/* Progress bar (thin strip at top) */}
            <div className="relative h-0.5 -mx-2 sm:-mx-4">
              <div className="absolute inset-0 bg-surface-200 dark:bg-surface-700">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3 min-h-[64px]">
              {/* Left: Album art + song info */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0 w-auto sm:w-56 md:w-64 lg:w-72">
                <Link
                  to="/player"
                  className="relative flex-shrink-0 group"
                  aria-label="Open full player"
                >
                  <img
                    src={coverUrl}
                    alt={currentSong.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover ring-1 ring-white/10 shadow-lg"
                    onError={(e) => {
                      e.target.src = "/assets/images/default-cover.svg";
                    }}
                  />
                  <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
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
                <div className="min-w-0 flex-1 hidden sm:block">
                  <Link
                    to="/player"
                    className="block text-sm font-semibold text-surface-800 dark:text-white truncate hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  >
                    {currentSong.title}
                  </Link>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                    {currentSong.artist}
                  </p>
                </div>
                <div className="hidden xs:flex sm:hidden">
                  {currentSong.is_premium && <PremiumBadge size="sm" />}
                </div>
              </div>

              {/* Center: Controls + Progress (hidden on very small screens) */}
              <div className="hidden sm:flex flex-1 flex-col items-center justify-center gap-0.5 max-w-xl mx-auto">
                {/* Control buttons */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={prevSong}
                    className="p-1.5 text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors rounded-full hover:bg-surface-100 dark:hover:bg-surface-700"
                    aria-label="Previous song"
                  >
                    <SkipPrevIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-2 sm:p-2.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 transition-all"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                  <button
                    onClick={nextSong}
                    className="p-1.5 text-surface-500 hover:text-surface-800 dark:hover:text-white transition-colors rounded-full hover:bg-surface-100 dark:hover:bg-surface-700"
                    aria-label="Next song"
                  >
                    <SkipNextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[10px] sm:text-xs tabular-nums text-surface-400 min-w-[32px] text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div
                    ref={progressRef}
                    className="relative flex-1 h-1.5 sm:h-2 rounded-full bg-surface-200 dark:bg-surface-700 cursor-pointer group"
                    onClick={handleSeek}
                    role="slider"
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") seekTo(Math.min(duration, currentTime + 5));
                      if (e.key === "ArrowLeft") seekTo(Math.max(0, currentTime - 5));
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 transition-all duration-100 ease-linear relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white shadow-md shadow-primary-500/40 scale-0 group-hover:scale-100 transition-transform border-2 border-primary-500" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs tabular-nums text-surface-400 min-w-[32px]">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
                {/* Premium badge on mobile */}
                <div className="hidden xs:block sm:hidden">
                  {currentSong.is_premium && <PremiumBadge size="sm" />}
                </div>

                {/* Like button */}
                {isAuthenticated && (
                  <button
                    onClick={() => toggleLike(currentSong.id)}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                      isLiked
                        ? "text-accent-500 hover:text-accent-600"
                        : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                    }`}
                    aria-label={isLiked ? "Unlike" : "Like"}
                  >
                    <HeartIcon
                      filled={isLiked}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </button>
                )}

                {/* Volume (desktop) */}
                <div className="hidden md:flex flex-col items-center gap-1">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    <VolumeIcon
                      muted={muted}
                      low={volume < 0.5}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-1 h-16 lg:h-20 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer range-input"
                    aria-label="Volume"
                    style={{ writingMode: "vertical-lr", direction: "rtl" }}
                  />
                </div>

                {/* Mobile volume toggle */}
                <div className="md:hidden relative">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors"
                    aria-label="Volume"
                  >
                    <VolumeIcon
                      muted={muted}
                      low={volume < 0.5}
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    />
                  </button>
                  {showVolume && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 glass dark:glass-dark rounded-xl shadow-xl">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={muted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 rounded-full bg-surface-200 dark:bg-surface-700 appearance-none cursor-pointer range-input"
                        aria-label="Volume"
                        style={{ writingMode: "vertical-lr", direction: "rtl" }}
                      />
                    </div>
                  )}
                </div>

                {/* Loop */}
                <button
                  onClick={toggleLoop}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                    loop
                      ? "text-primary-500 bg-primary-500/10"
                      : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                  }`}
                  aria-label={loop ? "Loop on" : "Loop off"}
                >
                  <LoopIcon active={loop} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Shuffle */}
                <button
                  onClick={toggleShuffle}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors ${
                    shuffle
                      ? "text-primary-500 bg-primary-500/10"
                      : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                  }`}
                  aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
                >
                  <ShuffleIcon active={shuffle} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Queue */}
                <Link
                  to="/player"
                  className="relative p-1.5 sm:p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition-colors rounded-full"
                  aria-label="Queue"
                >
                  <QueueIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {queue.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-primary-500 text-[8px] sm:text-[9px] font-bold text-white flex items-center justify-center shadow-lg">
                      {queue.length > 9 ? "9+" : queue.length}
                    </span>
                  )}
                </Link>

                {/* Expand to full player */}
                <Link
                  to="/player"
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500 hover:text-surface-800 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
                  aria-label="Open full player"
                >
                  <MaximizeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              </div>
            </div>

            {/* Mobile controls (collapsed into bottom row) */}
            <div className="flex sm:hidden items-center gap-2 pb-1.5">
              <span className="text-[10px] tabular-nums text-surface-400 min-w-[28px] text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="relative flex-1 h-1 rounded-full bg-surface-200 dark:bg-surface-700 cursor-pointer"
                onClick={handleSeek}
                role="slider"
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                tabIndex={0}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-surface-400 min-w-[28px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
