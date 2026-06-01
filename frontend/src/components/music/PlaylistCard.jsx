import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMediaUrl } from "../../utils/mediaUrl";

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MusicNoteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

const GRADIENT_PLACEHOLDERS = [
  "from-primary-500/20 via-accent-500/20 to-primary-600/20",
  "from-cyan-500/20 via-blue-500/20 to-primary-500/20",
  "from-accent-500/20 via-rose-500/20 to-amber-500/20",
  "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  "from-amber-500/20 via-orange-500/20 to-rose-500/20",
  "from-primary-600/20 via-purple-500/20 to-accent-500/20",
];

export default function PlaylistCard({ playlist, onPlay }) {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const coverUrl = playlist?.cover_image ? getMediaUrl(playlist.cover_image) : null;
  const songCount = playlist?.song_count ?? playlist?.songs?.length ?? 0;
  const gradientIndex = (playlist?.id || 0) % GRADIENT_PLACEHOLDERS.length;
  const gradient = GRADIENT_PLACEHOLDERS[gradientIndex];

  const handleClick = useCallback(() => {
    navigate(`/playlist/${playlist.id}`);
  }, [navigate, playlist?.id]);

  const handlePlay = useCallback(
    (e) => {
      e.stopPropagation();
      if (onPlay) {
        onPlay(playlist);
      }
    },
    [onPlay, playlist],
  );

  if (!playlist) return null;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="group relative flex flex-col rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white/70 dark:bg-surface-800/50 backdrop-blur-lg p-3 sm:p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary-400/30 dark:hover:border-primary-500/30 hover:shadow-primary-500/10 dark:hover:shadow-primary-500/5 cursor-pointer animate-fade-in"
    >
      {/* Cover */}
      <div className="relative mb-3 overflow-hidden rounded-xl aspect-square bg-surface-100 dark:bg-surface-700">
        {/* Gradient placeholder */}
        {(!coverUrl || imgError) && (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <MusicNoteIcon className="w-12 h-12 text-surface-400/50 dark:text-surface-500/50" />
          </div>
        )}

        {coverUrl && !imgError && (
          <img
            src={coverUrl}
            alt={playlist.name || "Playlist cover"}
            loading="lazy"
            className={`w-full h-full object-cover transition-all duration-500 ${
              imgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
            } group-hover:scale-105`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Hover overlay with play button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
          <button
            onClick={handlePlay}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-xl shadow-primary-500/40 flex items-center justify-center transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Play ${playlist.name}`}
          >
            <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
          </button>
        </div>

        {/* Public/Private badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider backdrop-blur-sm ${
              playlist.is_public
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-surface-500/20 text-surface-400 border border-surface-500/30"
            }`}
          >
            {playlist.is_public ? (
              <GlobeIcon className="w-2.5 h-2.5" />
            ) : (
              <LockIcon className="w-2.5 h-2.5" />
            )}
            <span>{playlist.is_public ? "Public" : "Private"}</span>
          </span>
        </div>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm text-surface-800 dark:text-white truncate mb-0.5" title={playlist.name}>
        {playlist.name}
      </h3>

      <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
        <MusicNoteIcon className="w-3 h-3" />
        <span>
          {songCount} song{songCount !== 1 ? "s" : ""}
        </span>
      </div>

      {playlist.description && (
        <p className="mt-1 text-[11px] text-surface-400 dark:text-surface-500 line-clamp-2">
          {playlist.description}
        </p>
      )}
    </div>
  );
}
