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

  useEffect(() => {
    loadLikedSongs();
  }, []);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnded = () => setIsPlaying(false);
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

  const playSong = (song) => {
    if (song?.can_play === false || !hasPlayableSource(song)) {
      return;
    }
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
    /* Queue not implemented — hook for future */
  };

  const prevSong = () => {
    seekTo(0);
  };

  const toggleLike = async (songId) => {
    await songService.toggleLike(songId);
    await loadLikedSongs();
  };

  useEffect(() => {
    // Auto-stop player when user logs out.
    if (!user) {
      stopPlayback(true);
      setLikedSongs([]);
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
