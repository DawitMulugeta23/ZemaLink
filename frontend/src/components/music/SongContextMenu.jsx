import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { songService } from "../../services/songService";

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
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

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ShareIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function FlagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function ArtistIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2a5 5 0 100 10 5 5 0 000-10z" />
      <path d="M2 22a10 10 0 0118.5-5.5" />
      <path d="M19 22v-6" />
      <path d="M16 19h6" />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function SongContextMenu({ song, position, onClose, isOpen }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong, addToQueue, playNext } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef(null);
  const menuItemsRef = useRef([]);

  const adjustedPosition = useMemo(() => {
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const menuW = 220;
    const menuH = showPlaylists ? Math.min(playlists.length * 40 + 80, 320) : 280;
    return {
      x: x + menuW > w ? Math.max(8, x - menuW - 8) : x,
      y: y + menuH > h ? Math.max(8, y - menuH + 40) : y,
    };
  }, [position, showPlaylists, playlists.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.focus();
    setFocusedIndex(-1);
    setShowPlaylists(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showPlaylists) return;
    const fetchPlaylists = async () => {
      setLoading(true);
      try {
        const response = await songService.getPlaylists();
        if (response.success) {
          setPlaylists(response.playlists || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, [showPlaylists]);

  const handlePlayNow = useCallback(() => {
    playSong({ ...song, can_play: true });
    onClose();
  }, [song, playSong, onClose]);

  const handlePlayNext = useCallback(() => {
    playNext(song);
    toast.success(`"${song.title}" will play next`);
    onClose();
  }, [song, playNext, onClose]);

  const handleAddToQueue = useCallback(() => {
    addToQueue(song);
    toast.success(`"${song.title}" added to queue`);
    onClose();
  }, [song, addToQueue, onClose]);

  const handleAddToPlaylist = useCallback(
    async (playlistId, playlistName) => {
      try {
        const response = await songService.addSongToPlaylist(playlistId, song.id);
        if (response.success) {
          toast.success(`"${song.title}" added to "${playlistName}"`);
        } else {
          toast.error(response.error || "Failed to add song");
        }
      } catch {
        toast.error("An error occurred");
      } finally {
        onClose();
      }
    },
    [song, onClose],
  );

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/song/${song.id}`;
    if (navigator.share) {
      navigator.share({ title: song.title, text: `Check out "${song.title}" by ${song.artist}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.error("Failed to copy"));
    }
    onClose();
  }, [song, onClose]);

  const handleReport = useCallback(() => {
    if (!user) {
      toast.info("Log in to report content.");
      onClose();
      return;
    }
    const reason = window.prompt("Describe the issue:");
    if (reason?.trim()) {
      songService.reportSong(song.id, reason.trim());
      toast.success("Report submitted. Thank you.");
    }
    onClose();
  }, [user, song, onClose]);

  const handleViewArtist = useCallback(() => {
    navigate(`/search?q=${encodeURIComponent(song.artist)}`);
    onClose();
  }, [song, navigate, onClose]);

  const handleKeyDown = useCallback(
    (e) => {
      const items = menuItemsRef.current;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && items[focusedIndex]) {
            items[focusedIndex].click();
          }
          break;
        case "Escape":
          e.preventDefault();
          if (showPlaylists) {
            setShowPlaylists(false);
          } else {
            onClose();
          }
          break;
      }
    },
    [focusedIndex, onClose, showPlaylists],
  );

  useEffect(() => {
    if (focusedIndex >= 0 && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex].focus();
    }
  }, [focusedIndex]);

  const menuItem = (label, icon, onClick, key) => (
    <button
      key={key}
      ref={(el) => {
        const idx = parseInt(key);
        if (!isNaN(idx)) menuItemsRef.current[idx] = el;
      }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded-xl transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
      role="menuitem"
    >
      <span className="flex-shrink-0 w-4 h-4 text-surface-400">{icon}</span>
      <span>{label}</span>
    </button>
  );

  if (!isOpen || !song) return null;

  const mainItems = [
    { label: "Play Now", icon: <PlayIcon className="w-full h-full" />, action: handlePlayNow, key: "0" },
    { label: "Play Next", icon: <PlusIcon className="w-full h-full" />, action: handlePlayNext, key: "1" },
    { label: "Add to Queue", icon: <QueueIcon className="w-full h-full" />, action: handleAddToQueue, key: "2" },
  ];

  const secondaryItems = [
    {
      label: "Add to Playlist",
      icon: <ChevronRightIcon className="w-full h-full" />,
      action: () => setShowPlaylists(true),
      key: "3",
    },
    { label: "Share", icon: <ShareIcon className="w-full h-full" />, action: handleShare, key: "4" },
  ];

  if (user) {
    secondaryItems.push({
      label: "Report",
      icon: <FlagIcon className="w-full h-full" />,
      action: handleReport,
      key: "5",
    });
  }

  secondaryItems.push({
    label: "View Artist",
    icon: <ArtistIcon className="w-full h-full" />,
    action: handleViewArtist,
    key: "6",
  });

  const allItems = [...mainItems, ...secondaryItems];

  return (
    <div
      ref={menuRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-[100] outline-none animate-fade-in"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
    >
      <div
        className="glass dark:glass-dark rounded-2xl shadow-2xl shadow-black/20 border border-surface-200 dark:border-surface-700/50 py-2 px-1.5 min-w-[200px] max-w-[220px] origin-top-left animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label="Song options"
      >
        {!showPlaylists ? (
          <>
            <div className="px-3 pb-2 mb-1 border-b border-surface-100 dark:border-surface-700/50">
              <p className="text-xs font-medium text-surface-800 dark:text-white truncate">{song.title}</p>
              <p className="text-[10px] text-surface-500 dark:text-surface-400 truncate">{song.artist}</p>
            </div>

            {/* Play options */}
            <div className="space-y-0.5">
              {mainItems.map((item) => menuItem(item.label, item.icon, item.action, item.key))}
            </div>

            <div className="mt-1 pt-1 border-t border-surface-100 dark:border-surface-700/50 space-y-0.5">
              {secondaryItems.map((item) => menuItem(item.label, item.icon, item.action, item.key))}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowPlaylists(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 transition-colors w-full text-left rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700/50"
            >
              <svg className="w-3.5 h-3.5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              Back
            </button>

            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Add to Playlist
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
              {loading ? (
                <div className="px-3 py-4 text-center text-xs text-surface-400">
                  Loading playlists...
                </div>
              ) : playlists.length === 0 ? (
                <Link
                  to="/playlists"
                  onClick={onClose}
                  className="flex items-center gap-2 px-3 py-2.5 text-xs text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded-xl transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Create a playlist
                </Link>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                    className="w-full text-left px-3 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700/50 rounded-xl transition-colors truncate"
                  >
                    {playlist.name}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
