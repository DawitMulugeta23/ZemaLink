import React from "react";
import { FaHeart, FaPlay } from "react-icons/fa";

function SongList({ songs = [], onPlay, likedSongIds = [], onLike }) {
  return (
    <div className="w-full">
      <table className="w-full text-white bg-white/5 rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-white/10">
            <th className="py-2 px-4 text-left">#</th>
            <th className="py-2 px-4 text-left">Title</th>
            <th className="py-2 px-4 text-left">Artist</th>
            <th className="py-2 px-4 text-left">Album</th>
            <th className="py-2 px-4 text-center">Like</th>
            <th className="py-2 px-4 text-center">Play</th>
          </tr>
        </thead>
        <tbody>
          {songs.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-white/60">
                No songs found.
              </td>
            </tr>
          )}
          {songs.map((song, idx) => (
            <tr
              key={song.id}
              className="hover:bg-white/10 transition border-b border-white/10"
            >
              <td className="py-2 px-4">{idx + 1}</td>
              <td className="py-2 px-4 font-semibold">{song.title}</td>
              <td className="py-2 px-4">{song.artist}</td>
              <td className="py-2 px-4">{song.album || "-"}</td>
              <td className="py-2 px-4 text-center">
                <button
                  className={`text-lg ${likedSongIds.includes(song.id) ? "text-pink-500" : "text-white/40"}`}
                  onClick={() => onLike && onLike(song.id)}
                  title={likedSongIds.includes(song.id) ? "Unlike" : "Like"}
                >
                  <FaHeart />
                </button>
              </td>
              <td className="py-2 px-4 text-center">
                <button
                  className="text-green-400 hover:text-green-300 text-lg"
                  onClick={() => onPlay && onPlay(song, songs, idx)}
                  title="Play"
                >
                  <FaPlay />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SongList;
