import { createContext, useContext, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { songService } from '../services/songService';

const PlayerContext = createContext(null);

function hasPlayableSource(song) {
  return Boolean(song?.file_path && String(song.file_path).trim() !== '');
}

export function PlayerProvider({ children }) {
  const { user } = useAuth();

  const audioRef = useRef(new Audio());
  const mediaRef = useRef(null);
  const endedHandlerRef = useRef(null);
  const isPlayingRef = useRef(false);

  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylistState] = useState([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [queue, setQueue] = useState([]);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('player-volume');
    return saved ? parseFloat(saved) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [relatedSongs, setRelatedSongs] = useState([]);

  const stopPlayback = useCallback((clearSong = false) => {
    const el = audioRef.current;
    el.pause();
    el.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (clearSong) setCurrentSong(null);
  }, []);

  const seekTo = useCallback((t) => {
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const loadLikedSongs = useCallback(async () => {
    if (!user) {
      setLikedSongs([]);
      return;
    }
    try {
      const data = await songService.getLikes();
      setLikedSongs(data.likes || []);
    } catch {
      setLikedSongs([]);
    }
  }, [user]);

  const loadRelatedSongs = useCallback(async (song) => {
    if (!song) return;
    try {
      const songs = await songService.getSongs();
      const related = songs.filter(s =>
        s.id !== song.id && (
          (s.artist && song.artist && s.artist.toLowerCase() === song.artist.toLowerCase()) ||
          (s.genre && song.genre && s.genre.toLowerCase() === song.genre.toLowerCase())
        )
      ).slice(0, 10);

      if (related.length < 4) {
        const moreSongs = songs.filter(s =>
          s.id !== song.id && !related.find(r => r.id === s.id)
        ).slice(0, 10 - related.length);
        setRelatedSongs([...related, ...moreSongs]);
      } else {
        setRelatedSongs(related);
      }
    } catch {
      setRelatedSongs([]);
    }
  }, []);

  const playSong = useCallback((song, index = -1) => {
    if (!song || song.can_play === false || !hasPlayableSource(song)) return;

    loadRelatedSongs(song);

    const el = audioRef.current;

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      return;
    }

    el.src = song.file_path;
    setCurrentSong(song);
    setIsPlaying(true);
    if (typeof index === 'number' && index >= 0) setPlaylistIndex(index);

    if (song?.id) songService.recordListen(song.id).catch(() => {});
  }, [currentSong, isPlaying, loadRelatedSongs]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!currentSong || !hasPlayableSource(currentSong)) {
      setIsPlaying(false);
      return;
    }
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentSong, isPlaying]);

  const pause = useCallback(() => {
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  const playNextOnEnd = useCallback(() => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      playSong(next);
      return;
    }

    if (loop) {
      const el = audioRef.current;
      el.currentTime = 0;
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    if (playlist.length > 0) {
      let nextIndex;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else {
        nextIndex = playlistIndex + 1;
        if (nextIndex >= playlist.length) {
          setIsPlaying(false);
          return;
        }
      }
      setPlaylistIndex(nextIndex);
      playSong(playlist[nextIndex], nextIndex);
      return;
    }

    if (relatedSongs.length > 0) {
      const [next, ...rest] = relatedSongs;
      setRelatedSongs(rest);
      playSong(next);
      return;
    }

    setIsPlaying(false);
  }, [queue, loop, playlist, shuffle, playlistIndex, relatedSongs, playSong]);

  const next = useCallback(() => {
    if (queue.length > 0) {
      const [nextSongItem, ...rest] = queue;
      setQueue(rest);
      playSong(nextSongItem);
      return;
    }

    if (playlist.length > 0) {
      let nextIndex;
      if (shuffle) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else {
        nextIndex = playlistIndex + 1;
        if (nextIndex >= playlist.length) {
          if (loop) nextIndex = 0;
          else return;
        }
      }
      setPlaylistIndex(nextIndex);
      playSong(playlist[nextIndex], nextIndex);
      return;
    }

    if (relatedSongs.length > 0) {
      const [nextSongItem, ...rest] = relatedSongs;
      setRelatedSongs(rest);
      playSong(nextSongItem);
      return;
    }
  }, [queue, playlist, shuffle, playlistIndex, loop, relatedSongs, playSong]);

  const prev = useCallback(() => {
    if (audioRef.current.currentTime > 3) {
      seekTo(0);
      return;
    }

    if (playlist.length > 0 && playlistIndex > 0) {
      const prevIndex = playlistIndex - 1;
      setPlaylistIndex(prevIndex);
      playSong(playlist[prevIndex], prevIndex);
      return;
    }

    seekTo(0);
  }, [playlist, playlistIndex, playSong, seekTo]);

  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((idOrIndex) => {
    setQueue(prev => {
      if (typeof idOrIndex === 'number') return prev.filter((_, i) => i !== idOrIndex);
      return prev.filter(s => s.id !== idOrIndex);
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const playNext = useCallback((song) => {
    setQueue(prev => [song, ...prev]);
  }, []);

  const setPlaylist = useCallback((songs, index = 0) => {
    setPlaylistState(songs);
    setPlaylistIndex(index);
    if (songs[index]) playSong(songs[index], index);
  }, [playSong]);

  const setVolume = useCallback((vol) => {
    const clamped = Math.max(0, Math.min(1, vol));
    audioRef.current.volume = clamped;
    setVolumeState(clamped);
    localStorage.setItem('player-volume', String(clamped));
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      audioRef.current.volume = volume || 1;
      setMuted(false);
    } else {
      audioRef.current.volume = 0;
      setMuted(true);
    }
  }, [muted, volume]);

  const toggleLoop = useCallback(() => {
    setLoop(prev => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleLike = useCallback(async (songId) => {
    try {
      await songService.toggleLike(songId);
      await loadLikedSongs();
    } catch {
      // silently fail
    }
  }, [loadLikedSongs]);

  useEffect(() => {
    audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => {
      setDuration(el.duration || 0);
      if (isPlayingRef.current) el.play().catch(() => setIsPlaying(false));
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);

    endedHandlerRef.current = playNextOnEnd;
    const onEnded = () => {
      if (endedHandlerRef.current) endedHandlerRef.current();
    };
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    endedHandlerRef.current = playNextOnEnd;
  }, [playNextOnEnd]);

  useEffect(() => {
    if (!isPlaying) return;
    const el = audioRef.current;
    if (el.src && el.paused) {
      el.play().catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  useEffect(() => {
    loadLikedSongs();
  }, [loadLikedSongs]);

  useEffect(() => {
    if (!user) {
      stopPlayback(true);
      setLikedSongs([]);
      setQueue([]);
      setRelatedSongs([]);
      setPlaylistState([]);
      setPlaylistIndex(-1);
      return;
    }
    loadLikedSongs();
  }, [user, stopPlayback, loadLikedSongs]);

  const value = useMemo(() => ({
    currentSong,
    isPlaying,
    likedSongs,
    playSong,
    togglePlay,
    toggleLike,
    loadLikedSongs,
    stopPlayback,
    currentTime,
    duration,
    seekTo,
    nextSong: next,
    prevSong: prev,
    queue,
    relatedSongs,
    addToQueue,
    removeFromQueue,
    clearQueue,
    mediaRef,
    audioRef,

    playlist,
    playlistIndex,
    volume,
    muted,
    loop,
    shuffle,
    play: playSong,
    pause,
    next,
    prev,
    seek: seekTo,
    setVolume,
    toggleMute,
    toggleLoop,
    toggleShuffle,
    playNext,
    setPlaylist,
  }), [
    currentSong, isPlaying, likedSongs, playSong, togglePlay, toggleLike,
    loadLikedSongs, stopPlayback, currentTime, duration, seekTo, next, prev,
    queue, relatedSongs, addToQueue, removeFromQueue, clearQueue, mediaRef, audioRef,
    playlist, playlistIndex, volume, muted, loop, shuffle, pause,
    setVolume, toggleMute, toggleLoop, toggleShuffle, playNext, setPlaylist,
  ]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
