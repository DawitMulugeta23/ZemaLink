import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { getMediaUrl } from "../../utils/mediaUrl";
import { formatTime, formatNumber } from "../../utils/helpers";
import SongContextMenu from "./SongContextMenu";
import RatingStars from "./RatingStars";
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

function SortArrow({ direction }) {
  if (!direction) return null;
  return (
    <svg className={`inline-block w-3 h-3 ml-1 transition-transform ${direction === "desc" ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 5l-7 7h14l-7-7z" />
    </svg>
  );
}

export default function SongList({ songs = [], onPlay, showHeader = true, compact = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay, likedSongs, toggleLike } = usePlayer();
  const [contextMenu, setContextMenu] = useState(null);
  const [contextSong, setContextSong] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const sortedSongs = useMemo(() => {
    if (!sortField) return songs;
    return [...songs].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "title") {
        aVal = (a.title || "").toLowerCase();
        bVal = (b.title || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortField === "artist") {
        aVal = (a.artist || "").toLowerCase();
        bVal = (b.artist || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortField === "album") {
        aVal = (a.album || "").toLowerCase();
        bVal = (b.album || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortField === "genre") {
        aVal = (a.genre || "").toLowerCase();
        bVal = (b.genre || "").toLowerCase();
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (sortField === "duration") {
        return sortDir === "asc" ? (a.duration || 0) - (b.duration || 0) : (b.duration || 0) - (a.duration || 0);
      }
      if (sortField === "plays") {
        return sortDir === "asc" ? (a.plays || 0) - (b.plays || 0) : (b.plays || 0) - (a.plays || 0);
      }
      if (sortField === "rating") {
        return sortDir === "asc" ? (a.rating || 0) - (b.rating || 0) : (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });
  }, [songs, sortField, sortDir]);

  const needsPurchaseCheck = useCallback(
    (song) => {
      const isPremiumUser = user?.subscription_status === 'premium';
      const isOwner = song?.uploader_id && Number(song.uploader_id) === Number(user?.id);
      return song?.is_premium && !isPremiumUser && !song?.purchased && !isOwner;
    },
    [user],
  );

  const handleRowPlay = useCallback(
    (song, e) => {
      e.stopPropagation();
      if (!user) {
        toast.info("Please log in to play music.");
        return;
      }
      if (needsPurchaseCheck(song)) {
        navigate(`/pro-deal?songId=${song.id}`);
        return;
      }
      if (onPlay) {
        onPlay(song);
      } else {
        playSong({ ...song, can_play: true });
      }
    },
    [user, onPlay, playSong, navigate, needsPurchaseCheck],
  );

  const handleRowClick = useCallback(
    (song) => {
      if (!user) return;
      if (needsPurchaseCheck(song)) {
        navigate(`/pro-deal?songId=${song.id}`);
        return;
      }
      if (currentSong?.id === song.id && isPlaying) {
        togglePlay();
      } else if (onPlay) {
        onPlay(song);
      } else {
        playSong({ ...song, can_play: true });
      }
    },
    [user, currentSong, isPlaying, togglePlay, onPlay, playSong, navigate, needsPurchaseCheck],
  );

  const handleLike = useCallback(
    (songId, e) => {
      e.stopPropagation();
      if (!user) {
        toast.info("Please log in to like songs.");
        return;
      }
      toggleLike(songId);
    },
    [user, toggleLike],
  );

  const handleContextMenu = useCallback(
    (song, e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) return;
      setContextSong(song);
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [user],
  );

  const sortableHeader = (label, field) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-white transition-colors"
    >
      {label}
      {sortField === field && <SortArrow direction={sortDir} />}
    </button>
  );

  const columns = compact
    ? ["#", "title", "duration", "actions"]
    : ["#", "cover", "title", "album", "genre", "duration", "plays", "rating", "actions"];

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[600px] lg:min-w-full">
        {showHeader && (
          <thead>
            <tr className="border-b border-surface-200 dark:border-surface-700/50">
              <th className="py-3 px-2 sm:px-3 text-left w-10">
                <span className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  #
                </span>
              </th>
              <th className="py-3 px-2 sm:px-3 text-left w-12" />
              <th className="py-3 px-2 sm:px-3 text-left">
                {sortableHeader("Title", "title")}
              </th>
              <th className={`py-3 px-2 sm:px-3 text-left ${compact ? "hidden" : "hidden lg:table-cell"}`}>
                {sortableHeader("Album", "album")}
              </th>
              <th className={`py-3 px-2 sm:px-3 text-left ${compact ? "hidden" : "hidden md:table-cell"}`}>
                {sortableHeader("Genre", "genre")}
              </th>
              <th className={`py-3 px-2 sm:px-3 text-left w-16 ${compact ? "hidden sm:table-cell" : "table-cell"}`}>
                {sortableHeader("Duration", "duration")}
              </th>
              <th className={`py-3 px-2 sm:px-3 text-left w-16 ${compact ? "hidden" : "hidden lg:table-cell"}`}>
                {sortableHeader("Plays", "plays")}
              </th>
              <th className={`py-3 px-2 sm:px-3 text-left w-20 ${compact ? "hidden" : "hidden xl:table-cell"}`}>
                {sortableHeader("Rating", "rating")}
              </th>
              <th className="py-3 px-2 sm:px-3 text-right w-24">
                <span className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
        )}
        <tbody>
          {sortedSongs.length === 0 ? (
            <tr>
              <td
                colSpan={compact ? 5 : 9}
                className="py-12 text-center text-surface-400 dark:text-surface-500 text-sm"
              >
                No songs found
              </td>
            </tr>
          ) : (
            sortedSongs.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              const isSongLiked = likedSongs?.some((s) => s.id === song.id);
              const coverUrl = getMediaUrl(song.cover_image);

              return (
                <tr
                  key={song.id}
                  onClick={() => handleRowClick(song)}
                  onContextMenu={(e) => handleContextMenu(song, e)}
                  className={`group cursor-pointer transition-colors ${
                    isCurrent
                      ? "bg-primary-500/5 dark:bg-primary-500/10 border-l-2 border-l-primary-500"
                      : idx % 2 === 0
                        ? "bg-white/30 dark:bg-surface-800/20 hover:bg-surface-50 dark:hover:bg-surface-700/30"
                        : "bg-surface-50/30 dark:bg-surface-800/10 hover:bg-surface-100 dark:hover:bg-surface-700/30"
                  }`}
                >
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-sm text-surface-400 tabular-nums">
                    <div className="flex items-center gap-2">
                      <span className={`${isCurrent ? "hidden" : "group-hover:hidden"}`}>
                        {idx + 1}
                      </span>
                      <button
                        onClick={(e) => handleRowPlay(song, e)}
                        className={`${
                          isCurrent ? "flex" : "hidden group-hover:flex"
                        } items-center justify-center w-6 h-6 rounded-full text-primary-500 hover:bg-primary-500/10 transition-colors`}
                        aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                      >
                        {isCurrent && isPlaying ? (
                          <PauseIcon className="w-3.5 h-3.5" />
                        ) : (
                          <PlayIcon className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                    <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 flex-shrink-0 ring-1 ring-surface-200 dark:ring-surface-600/50">
                      <img
                        src={coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "/assets/images/default-cover.svg";
                        }}
                      />
                      {song.is_premium && (
                        <div className="absolute top-0 left-0">
                          <PremiumBadge size="sm" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] lg:max-w-[280px] ${
                            isCurrent
                              ? "text-primary-500 dark:text-primary-400"
                              : "text-surface-800 dark:text-white"
                          }`}
                        >
                          {song.title}
                        </span>
                        {song.is_premium && (
                          <PremiumBadge size="sm" />
                        )}
                      </div>
                      <span className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-[140px] sm:max-w-[220px] lg:max-w-[300px]">
                        {song.artist}
                      </span>
                    </div>
                  </td>
                  <td className={`py-2.5 sm:py-3 px-2 sm:px-3 text-sm text-surface-500 dark:text-surface-400 truncate max-w-[120px] ${compact ? "hidden" : "hidden lg:table-cell"}`}>
                    {song.album || "-"}
                  </td>
                  <td className={`py-2.5 sm:py-3 px-2 sm:px-3 ${compact ? "hidden" : "hidden md:table-cell"}`}>
                    {song.genre ? (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                        {song.genre}
                      </span>
                    ) : (
                      <span className="text-sm text-surface-400">-</span>
                    )}
                  </td>
                  <td className={`py-2.5 sm:py-3 px-2 sm:px-3 text-sm text-surface-500 dark:text-surface-400 tabular-nums ${compact ? "hidden sm:table-cell" : "table-cell"}`}>
                    {formatTime(song.duration)}
                  </td>
                  <td className={`py-2.5 sm:py-3 px-2 sm:px-3 text-sm text-surface-500 dark:text-surface-400 tabular-nums ${compact ? "hidden" : "hidden lg:table-cell"}`}>
                    {formatNumber(song.plays || song.plays_count || 0)}
                  </td>
                  <td className={`py-2.5 sm:py-3 px-2 sm:px-3 ${compact ? "hidden" : "hidden xl:table-cell"}`}>
                    <RatingStars rating={song.rating || 0} size="sm" />
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {user && (
                        <button
                          onClick={(e) => handleLike(song.id, e)}
                          className={`p-1.5 rounded-full transition-colors ${
                            isSongLiked
                              ? "text-accent-500"
                              : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 opacity-0 group-hover:opacity-100"
                          }`}
                          aria-label={isSongLiked ? "Unlike" : "Like"}
                        >
                          <HeartIcon filled={isSongLiked} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      {user && (
                        <button
                          onClick={(e) => handleContextMenu(song, e)}
                          className="p-1.5 rounded-full text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="More options"
                        >
                          <MoreIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {contextMenu && contextSong && (
        <SongContextMenu
          song={contextSong}
          position={contextMenu}
          isOpen={!!contextMenu}
          onClose={() => {
            setContextMenu(null);
            setContextSong(null);
          }}
        />
      )}
    </div>
  );
}
