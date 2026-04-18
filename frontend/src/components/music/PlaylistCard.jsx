import { FaMusic } from "react-icons/fa";

function PlaylistCard({ playlist, onClick }) {
  return (
    <div
      className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex flex-col items-center cursor-pointer hover:scale-105 transition shadow-lg"
      onClick={() => onClick && onClick(playlist)}
      title={playlist.name}
    >
      <div className="w-24 h-24 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/40 to-purple-500/40 mb-3 overflow-hidden">
        {playlist.cover_image ? (
          <img
            src={playlist.cover_image}
            alt={playlist.name}
            className="object-cover w-full h-full rounded-xl"
          />
        ) : (
          <FaMusic className="text-4xl text-white/60" />
        )}
      </div>
      <div className="text-white font-semibold text-lg text-center truncate w-24">
        {playlist.name}
      </div>
      {playlist.songs && (
        <div className="text-xs text-white/50 mt-1">
          {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

export default PlaylistCard;
