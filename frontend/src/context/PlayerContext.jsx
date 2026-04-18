import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { songService } from "../services/songService";

export const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
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
    const el = audioRef.current;
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
    const el = audioRef.current;
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
    if (audioRef.current && currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
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
    if (!audioRef.current || !currentSong || !hasPlayableSource(currentSong)) {
      setIsPlaying(false);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const seekTo = (t) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
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

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        likedSongs,
        audioRef,
        playSong,
        togglePlay,
        toggleLike,
        loadLikedSongs,
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
