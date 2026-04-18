import { useEffect, useState } from "react";
import SongCard from "../components/music/SongCard";
import { songService } from "../services/songService";

function Purchased() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await songService.getPurchasedSongs();
      setSongs(list.map((s) => ({ ...s, can_play: true })));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Purchased tracks</h1>
      {songs.length === 0 ? (
        <p className="text-white/50">No purchases yet. Browse premium songs to buy.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {songs.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Purchased;
