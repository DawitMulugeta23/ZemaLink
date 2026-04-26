import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { songService } from "../services/songService";

export const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const mediaRef = useRef(null);

  const stopPlayback = (clearSong = false) => {
    const el = mediaRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (clearSong) {
      setCurrentSong(null);
    }
  };

  const hasPlayableSource = (song) =>
    Boolean(song?.file_path && String(song.file_path).trim() !== "");

  const loadLikedSongs = async () => {
    const data = await songService.getLikes();
    setLikedSongs(data.likes || []);
  };

  // Load related songs when current song changes
  const loadRelatedSongs = async (song) => {
    if (!song) return;
    try {
      const songs = await songService.getSongs();
      const related = songs.filter(s => 
        s.id !== song.id && (
          (s.artist && song.artist && 
           s.artist.toLowerCase() === song.artist.toLowerCase()) ||
          (s.genre && song.genre && 
           s.genre.toLowerCase() === song.genre.toLowerCase())
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
    } catch (error) {
      console.error("Error loading related songs:", error);
    }
  };

  useEffect(() => {
    loadLikedSongs();
  }, []);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      // Auto play next when song ends
      nextSong();
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [currentSong]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !currentSong || !hasPlayableSource(currentSong)) return;
    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [currentSong, isPlaying]);

  const playSong = (song, index = -1) => {
    if (song?.can_play === false || !hasPlayableSource(song)) {
      return;
    }
    
    // Load related songs for this song
    loadRelatedSongs(song);
    
    if (mediaRef.current && currentSong?.id === song.id) {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        mediaRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      if (song?.id) {
        songService.recordListen(song.id);
      }
    }
  };

  const togglePlay = () => {
    if (!mediaRef.current || !currentSong || !hasPlayableSource(currentSong)) {
      setIsPlaying(false);
      return;
    }
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  };

  const seekTo = (t) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const nextSong = () => {
    // First check queue
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const remainingQueue = queue.slice(1);
      setQueue(remainingQueue);
      playSong(nextTrack);
      return;
    }
    
    // Then check related songs
    if (relatedSongs.length > 0) {
      const nextTrack = relatedSongs[0];
      const remainingRelated = relatedSongs.slice(1);
      setRelatedSongs(remainingRelated);
      playSong(nextTrack);
      return;
    }
    
    // If nothing in queue or related, just stop
    console.log("No more songs in queue or related");
  };

  const prevSong = () => {
    // If current time > 3 seconds, just restart current song
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    
    // TODO: Implement previous song history
    // For now, just restart current song
    seekTo(0);
  };

  const addToQueue = (song) => {
    setQueue(prev => [...prev, song]);
  };

  const removeFromQueue = (songId) => {
    setQueue(prev => prev.filter(s => s.id !== songId));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const toggleLike = async (songId) => {
    await songService.toggleLike(songId);
    await loadLikedSongs();
  };

  useEffect(() => {
    if (!user) {
      stopPlayback(true);
      setLikedSongs([]);
      setQueue([]);
      setRelatedSongs([]);
      return;
    }
    loadLikedSongs();
  }, [user]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        likedSongs,
        mediaRef,
        audioRef: mediaRef,
        playSong,
        togglePlay,
        toggleLike,
        loadLikedSongs,
        stopPlayback,
        currentTime,
        duration,
        seekTo,
        nextSong,
        prevSong,
        queue,
        relatedSongs,
        addToQueue,
        removeFromQueue,
        clearQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}