import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_COVER } from '../constants';

function formatTime(t) {
  if (!t || isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isPremium } = useAuth();
  const {
    currentSong, isPlaying, togglePlay, nextSong, prevSong,
    likedSongs, toggleLike, currentTime, duration, seekTo,
    queue, relatedSongs, addToQueue, removeFromQueue, clearQueue,
    volume, setVolume, muted, toggleMute, toggleLoop, loop, playSong,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const videoRef = useRef(null);
  const progressRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
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
  }, [togglePlay, seekTo, currentTime, duration, setVolume, volume, toggleMute]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isLocked = currentSong?.is_premium && !currentSong?.can_play && !isPremium && !currentSong?.purchased;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/player');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!currentSong && !authLoading) {
      navigate('/browse');
    }
  }, [currentSong, authLoading, navigate]);

  useEffect(() => {
    if (isLocked && currentSong) {
      toast.warning('This is a premium track. Please purchase it first.');
      navigate(`/pro-deal?songId=${currentSong.id}`);
    }
  }, [isLocked, currentSong, navigate]);

  const handleProgressClick = (e) => {
    if (isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    seekTo(pct * duration);
  };

  const isLiked = currentSong && likedSongs?.some((s) => s.id === currentSong.id);

  const coverImage = currentSong?.cover_image && currentSong.cover_image !== 'null'
    ? currentSong.cover_image : DEFAULT_COVER;

  const audioSrc = currentSong?.file_path?.trim() || null;
  const isVideo = currentSong?.media_type === 'video';

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-400">No song is playing</p>
        <button onClick={() => navigate('/browse')} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium">
          Browse Music
        </button>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="glass-dark rounded-2xl border border-white/10 p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">Premium Track</h2>
          <p className="text-slate-400 mb-1">{currentSong.title} &mdash; {currentSong.artist}</p>
          <p className="text-slate-500 text-sm mb-6">Purchase this track for lifetime access.</p>
          <button onClick={() => navigate(`/pro-deal?songId=${currentSong.id}`)} className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:scale-105 transition">
            Unlock for ${Number(currentSong.price || 0.99).toFixed(2)}
          </button>
          <div className="mt-4">
            <button onClick={() => navigate('/browse')} className="text-sm text-slate-500 hover:text-white transition">
              &larr; Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition text-sm">
        <span>&larr;</span> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Player */}
        <div className="lg:col-span-2">
          <div className="glass-dark rounded-2xl border border-white/10 overflow-hidden">
            {/* Cover art area with gradient overlay */}
            <div className="relative bg-gradient-to-b from-surface-800 to-surface-900">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${coverImage})` }}
              />
              <div className="relative flex items-center justify-center p-8 md:p-12">
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={audioSrc}
                    className="w-full max-w-2xl aspect-video object-contain rounded-xl shadow-2xl"
                    poster={coverImage}
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={coverImage}
                    alt={currentSong.title}
                    className="w-full max-w-xs aspect-square object-cover rounded-2xl shadow-2xl ring-1 ring-white/10"
                    onError={(e) => { e.target.src = DEFAULT_COVER; }}
                  />
                )}
              </div>
            </div>

            {/* Controls section */}
            <div className="p-6 md:p-8">
              {/* Song info row */}
              <div className="flex items-start justify-between mb-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl font-bold text-white truncate flex items-center gap-2">
                    {currentSong.title}
                    {currentSong.is_premium && (
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">PRO</span>
                    )}
                  </h1>
                  <p className="text-base text-slate-400 mt-1">{currentSong.artist}</p>
                  {currentSong.album && <p className="text-sm text-slate-500 mt-0.5">{currentSong.album}</p>}
                </div>
                <button
                  onClick={() => toggleLike(currentSong.id)}
                  className={`shrink-0 text-2xl transition-all hover:scale-110 ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  {isLiked ? '❤️' : '🤍'}
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-1">
                <div
                  ref={progressRef}
                  className="relative h-2 rounded-full bg-surface-700 cursor-pointer group"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md scale-0 group-hover:scale-100 transition-transform border-2 border-primary-500" />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="text-slate-500 hover:text-white transition text-lg"
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                    className="range-input w-24"
                  />
                  <span className="text-xs text-slate-500 w-8">{Math.round(volume * 100)}%</span>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={prevSong} className="text-slate-400 hover:text-white transition hover:scale-110" title="Previous">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl transition hover:scale-110 shadow-lg shadow-primary-500/25"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button onClick={nextSong} className="text-slate-400 hover:text-white transition hover:scale-110" title="Next">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleLoop}
                    className={`text-sm transition ${loop ? 'text-primary-400' : 'text-slate-500 hover:text-white'}`}
                    title={loop ? 'Loop enabled' : 'Loop disabled'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={loop ? 2.5 : 2} viewBox="0 0 24 24">
                      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Related / Queue */}
        <div className="lg:col-span-1">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowQueue(false)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${!showQueue ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
            >
              Up Next {relatedSongs.length > 0 && `(${relatedSongs.length})`}
            </button>
            <button
              onClick={() => setShowQueue(true)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${showQueue ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
            >
              Queue {queue.length > 0 && `(${queue.length})`}
            </button>
          </div>

          {!showQueue ? (
            <div className="glass-dark rounded-2xl border border-white/10 p-4 sticky top-24 max-h-[500px] overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Related Songs</h3>
              {relatedSongs.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No related songs found</p>
              ) : (
                <div className="space-y-2">
                  {relatedSongs.map((song, i) => (
                    <button
                      key={song.id}
                      onClick={() => playSong({ ...song, can_play: true })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition text-left group"
                    >
                      <span className="text-xs text-slate-500 w-5 shrink-0">{i === 0 ? '▶' : i + 1}</span>
                      <img
                        src={song.cover_image && song.cover_image !== 'null' ? song.cover_image : DEFAULT_COVER}
                        alt={song.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        onError={(e) => { e.target.src = DEFAULT_COVER; }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{song.title}</p>
                        <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addToQueue(song); }}
                        className="text-slate-500 hover:text-primary-400 transition text-xs shrink-0 opacity-0 group-hover:opacity-100"
                        title="Add to queue"
                      >
                        + Queue
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-dark rounded-2xl border border-white/10 p-4 sticky top-24 max-h-[500px] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Queue</h3>
                {queue.length > 0 && (
                  <button onClick={clearQueue} className="text-xs text-slate-500 hover:text-red-400 transition">Clear</button>
                )}
              </div>
              {queue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Queue is empty</p>
                  <p className="text-slate-600 text-xs mt-1">Add songs from the &ldquo;Up Next&rdquo; tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((song, i) => (
                    <div key={`${song.id}-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition group">
                      <span className="text-xs text-slate-500 w-5 shrink-0">{i + 1}</span>
                      <img
                        src={song.cover_image && song.cover_image !== 'null' ? song.cover_image : DEFAULT_COVER}
                        alt={song.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        onError={(e) => { e.target.src = DEFAULT_COVER; }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{song.title}</p>
                        <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                      </div>
                      <button
                        onClick={() => removeFromQueue(song.id)}
                        className="text-slate-500 hover:text-red-400 transition text-xs shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove"
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
    </div>
  );
}
