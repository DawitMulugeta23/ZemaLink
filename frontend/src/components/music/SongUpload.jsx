import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import CloudinaryUpload from "./CloudinaryUpload";

function SongUpload({ onSuccess }) {
  const { user } = useAuth();
    title: "",
    artist: "",
    album: "",
    duration: 0,
  });
  const [audioData, setAudioData] = useState(null);
  const [mediaType, setMediaType] = useState("audio");
  const [coverData, setCoverData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!audioData) {
      setMessage(`Please upload a ${mediaType} file`);
      return;
    }

    setUploading(true);
    setMessage("");

    const songData = {
      ...formData,
      audio_url: audioData.url,
      audio_public_id: audioData.publicId,
      audio_duration: audioData.duration,
      media_type: mediaType,
      cover_url: coverData?.url || null,
      cover_public_id: coverData?.publicId || null,
    };

    try {
      const response = await fetch(
        "http://localhost/ZemaLink/backend/upload-song.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(songData),
        },
      );

      const result = await response.json();

      if (result.success) {
        setMessage("Song uploaded successfully!");
        setFormData({
          title: "",
          artist: "",
          album: "",
          duration: 0,
        });
        setAudioData(null);
        setMediaType("audio");
        setCoverData(null);
        if (onSuccess) onSuccess();
      } else {
        setMessage("Error: " + result.error);
      }
    } catch (error) {
      setMessage("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (user?.role !== "musician" && user?.role !== "admin") {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Only musicians can upload songs</p>
      </div>
    );
  }

  return (
    <div className="card-base p-6">
      <h2 className="text-2xl font-bold mb-4">Upload New Song</h2>

      {message && (
        <div
          className={`p-3 rounded-xl mb-4 ${message.includes("success") ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2">Song Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-slate-700 mb-2">Artist Name *</label>
          <input
            type="text"
            required
            value={formData.artist}
            onChange={(e) =>
              setFormData({ ...formData, artist: e.target.value })
            }
            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-700 mb-2">Album</label>
          <input
            type="text"
            value={formData.album}
            onChange={(e) =>
              setFormData({ ...formData, album: e.target.value })
            }
            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-700 mb-2">Cover Image</label>
          <CloudinaryUpload
            type="image"
            onUploadSuccess={(data) => setCoverData(data)}
          />
        </div>

        <div>
          <label className="block text-slate-700 mb-2">Media Type *</label>
          <select
            value={mediaType}
            onChange={(e) => {
              setMediaType(e.target.value);
              setAudioData(null);
            }}
            className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-white"
          >
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 mb-2">
            {mediaType === "video" ? "Video File *" : "Audio File (MP3) *"}
          </label>
          <CloudinaryUpload
            type={mediaType === "video" ? "video" : "audio"}
            onUploadSuccess={(data) => setAudioData(data)}
          />
        </div>



        <button
          type="submit"
          disabled={uploading || !audioData}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:scale-105 transition disabled:opacity-50"
        >
          {uploading ? "Saving..." : "Save Song"}
        </button>
      </form>
    </div>
  );
}

export default SongUpload;
