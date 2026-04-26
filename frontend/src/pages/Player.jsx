import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { DEFAULT_COVER } from "../constants";

function Player() {
  const navigate = useNavigate();
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
    queue,
    relatedSongs,
    addToQueue,
    removeFromQueue,
    clearQueue,
  } = usePlayer();

  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume / 100;
    }
  }, [volume, mediaRef]);

  useEffect(() => {
    if (!currentSong) {
      navigate("/browse");
      return;
    }
  }, [currentSong, navigate]);

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

  if (!currentSong) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-white/50 mb-4">No song is playing</p>
          <button
            onClick={() => navigate("/browse")}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white"
          >
            Browse Music
          </button>
        </div>
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition"
      >
        <span className="text-xl">←</span>
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Player */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-b from-white/10 to-black/20 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            
            {/* Video or Album Art */}
            {isVideo ? (
              <div className="relative bg-black">
                <video
                  ref={mediaRef}
                  src={audioSrc}
                  className="w-full aspect-video object-contain"
                  poster={coverImage}
                  playsInline
                  autoPlay={isPlaying}
                />
              </div>
            ) : (
              <div className="relative p-8 flex justify-center">
                <div className="relative group">
                  <img
                    src={coverImage}
                    alt={currentSong.title}
                    className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl object-cover"
                    onError={(e) => {
                      e.target.src = DEFAULT_COVER;
                    }}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">{isPlaying ? "🎵" : "▶️"}</div>
                      <p className="text-white text-sm">{isPlaying ? "Playing" : "Paused"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Song Info */}
            <div className="p-6 border-t border-white/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {currentSong.title}
                    {currentSong?.is_premium && (
                      <span className="ml-2 inline-flex rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white align-middle">
                        PRO
                      </span>
                    )}
                  </h1>
                  <p className="text-white/60 text-lg">{currentSong.artist}</p>
                  {currentSong.album && (
                    <p className="text-white/40 text-sm mt-1">{currentSong.album}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleLike(currentSong.id)}
                  className="text-3xl hover:scale-110 transition"
                >
                  {isLiked ? "❤️" : "🤍"}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <input
                  type="range"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={handleSeek}
                  className="w-full h-1.5 rounded-full bg-white/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
                <button
                  onClick={prevSong}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl md:text-2xl transition hover:scale-110"
                >
                  ⏮
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white text-3xl md:text-4xl transition hover:scale-110 shadow-lg"
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button
                  onClick={nextSong}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl md:text-2xl transition hover:scale-110"
                >
                  ⏭
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleMute}
                  className="text-white/70 hover:text-white text-xl"
                >
                  {isMuted || volume === 0 ? "🔇" : volume < 50 ? "🔉" : "🔊"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-32 h-1 rounded-full bg-white/20 appearance-none cursor-pointer"
                />
                <span className="text-white/50 text-xs">{Math.round(volume)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Related Music & Queue */}
        <div className="lg:col-span-1">
          {/* Toggle between Related and Queue */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowQueue(false)}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${
                !showQueue 
                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" 
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              🎵 Related {relatedSongs.length > 0 && `(${relatedSongs.length})`}
            </button>
            <button
              onClick={() => setShowQueue(true)}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${
                showQueue 
                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" 
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              📋 Queue {queue.length > 0 && `(${queue.length})`}
            </button>
          </div>

          {/* Related Music Panel */}
          {!showQueue && (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎵</span>
                Up Next
              </h2>
              
              {relatedSongs.length === 0 ? (
                <p className="text-white/40 text-center py-8">
                  No related songs found
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                  {relatedSongs.map((song, index) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer group"
                      onClick={() => {
                        // Play this song and set remaining as next
                        const remaining = relatedSongs.slice(index + 1);
                        // TODO: Update context to set remaining as next
                        playSong(song);
                      }}
                    >
                      <div className="text-white/40 text-sm w-6">
                        {index === 0 ? "▶" : index + 1}
                      </div>
                      <img
                        src={song.cover_image && song.cover_image !== "null" ? song.cover_image : DEFAULT_COVER}
                        alt={song.title}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = DEFAULT_COVER;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate text-sm">
                          {song.title}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {song.artist}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(song);
                        }}
                        className="text-white/30 hover:text-white/70 text-sm transition"
                        title="Add to queue"
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Queue Panel */}
          {showQueue && (
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 sticky top-24">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Queue
                </h2>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-xs text-white/50 hover:text-red-400 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/40 text-sm mb-2">Queue is empty</p>
                  <p className="text-white/30 text-xs">Click the 📋 button on any song to add to queue</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                  {queue.map((song, index) => (
                    <div
                      key={song.id + index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                    >
                      <div className="text-white/40 text-sm w-6">
                        {index === 0 ? "▶" : index + 1}
                      </div>
                      <img
                        src={song.cover_image && song.cover_image !== "null" ? song.cover_image : DEFAULT_COVER}
                        alt={song.title}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = DEFAULT_COVER;
                        }}
                      />
                      <div className="flex-1 min-w-0" onClick={() => {
                        // Play this song and remove previous queue items
                        const remaining = queue.slice(index + 1);
                        // TODO: Update context to set remaining as queue
                        playSong(song);
                      }}>
                        <p className="text-white font-medium truncate text-sm">
                          {song.title}
                        </p>
                        <p className="text-white/40 text-xs truncate">
                          {song.artist}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromQueue(song.id)}
                        className="text-white/30 hover:text-red-400 text-sm transition"
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element for audio playback */}
      {!isVideo && (
        <audio ref={mediaRef} src={audioSrc} preload="metadata" className="hidden" />
      )}
    </div>
  );
}

export default Player;