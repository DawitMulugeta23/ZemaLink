import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SongCard from "../components/music/SongCard";
import { songService } from "../services/songService";
import "./Pages.css";

function Playlist() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPlaylist = async () => {
    setLoading(true);
    const playlistsData = await songService.getPlaylists();
    const found = playlistsData.playlists?.find((p) => p.id == id);
    if (found) {
      setPlaylist(found);
      const playlistSongs = await songService.getPlaylistSongs(id);
      setSongs(playlistSongs);
    }
    setLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      await loadPlaylist();
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2>Playlist not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="playlist-header">
        <h1 className="page-title">{playlist.name}</h1>
        <p>{songs.length} songs</p>
      </div>
      <div className="songs-grid">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  );
}

export default Playlist;
