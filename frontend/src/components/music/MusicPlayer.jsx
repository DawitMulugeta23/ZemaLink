import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_COVER } from "../../constants";

function MusicPlayer() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    mediaRef,
    playSong,
  } = usePlayer();

  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume / 100;
    }
  }, [volume, mediaRef]);

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    seekTo(seekTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(70);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isLiked = currentSong && likedSongs?.some((s) => s.id === currentSong.id);
  
  // Check if song is premium and user doesn't have access
  const isPremium = currentSong?.is_premium === 1;
  const hasAccess = currentSong?.can_play === true || 
                    user?.subscription_status === 'premium' ||
                    currentSong?.purchased === true;
  const isLocked = isPremium && !hasAccess;

  // Handle play button - check access
  const handlePlay = () => {
    if (isLocked) {
      toast.warning("This is a premium track. Please purchase it first.");
      navigate(`/pro-deal?songId=${currentSong?.id}`);
      return;
    }
    togglePlay();
  };

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 text-center z-50">
        <p className="text-white/50 text-sm">Select a song to play</p>
      </div>
    );
  }

  const audioSrc = currentSong.file_path && String(currentSong.file_path).trim() !== ""
    ? currentSong.file_path
    : null;
  const isVideo = currentSong?.media_type === "video";
  const coverImage = currentSong.cover_image && currentSong.cover_image !== "null"
    ? currentSong.cover_image
    : DEFAULT_COVER;

  return (
    <>
      {audioSrc && !isVideo && (
        <audio ref={mediaRef} src={audioSrc} preload="metadata" className="hidden" />
      )}
      {audioSrc && isVideo && (
        <video ref={mediaRef} src={audioSrc} preload="metadata" className="hidden" />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            {/* Song Info */}
            <div className="flex items-center gap-3 w-full md:w-64">
              <img
                src={coverImage}
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                onClick={() => navigate("/player")}
                onError={(e) => {
                  e.target.src = DEFAULT_COVER;
                }}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate("/player")}>
                <h4 className="text-sm font-semibold truncate flex items-center gap-1">
                  <span className="truncate">{currentSong.title}</span>
                  {isPremium && hasAccess && (
                    <span className="inline-flex rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      PRO
                    </span>
                  )}
                  {isPremium && isLocked && (
                    <span className="inline-flex rounded-full bg-gray-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      LOCKED
                    </span>
                  )}
                </h4>
                <p className="text-xs text-white/50 truncate">
                  {currentSong.artist}
                </p>
                <p className="text-[11px] text-white/45 uppercase tracking-wide">
                  {isVideo ? "Video" : "Audio"}
                </p>
              </div>
              <button
                onClick={() => toggleLike(currentSong.id)}
                className="text-xl hover:scale-110 transition"
                disabled={isLocked}
              >
                {isLiked ? "❤️" : "🤍"}
              </button>
            </div>

            {/* Player Controls */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={prevSong}
                  className="text-white/70 hover:text-white text-xl transition hover:scale-110"
                  disabled={isLocked}
                >
                  ⏮
                </button>
                <button
                  onClick={handlePlay}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white text-xl hover:scale-110 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLocked}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button
                  onClick={nextSong}
                  className="text-white/70 hover:text-white text-xl transition hover:scale-110"
                  disabled={isLocked}
                >
                  ⏭
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-xs text-white/50">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={handleSeek}
                  disabled={isLocked}
                  className="flex-1 h-1 rounded-full bg-white/20 appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
                <span className="text-xs text-white/50">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="hidden md:flex items-center gap-2 w-32">
              <button
                onClick={toggleMute}
                className="text-white/70 hover:text-white"
                disabled={isLocked}
              >
                {isMuted || volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                disabled={isLocked}
                className="flex-1 h-1 rounded-full bg-white/20 appearance-none cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
              />
            </div>

            {/* Locked premium banner */}
            {isLocked && (
              <button
                onClick={() => navigate(`/pro-deal?songId=${currentSong.id}`)}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-105 text-white text-sm font-semibold transition"
              >
                <span>🔒</span>
                <span>Unlock for ${Number(currentSong.price || 0.99).toFixed(2)}</span>
              </button>
            )}

            {/* Expand to Player Page Button */}
            {!isLocked && (
              <button
                onClick={() => navigate("/player")}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm transition"
              >
                <span>🎵</span>
                <span>Now Playing</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default MusicPlayer;