import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { liveStreamService } from "../services/liveStreamService";
import { toast } from "react-toastify";

function ReplayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showInput, setShowInput] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadReplay();
    loadMessages();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadReplay = async () => {
    try {
      const res = await liveStreamService.getReplay(id);
      if (res.success) {
        setStream(res.stream);
        setVideoUrl(res.stream.video_url || "");
      } else {
        toast.error(res.message || "Access denied");
        navigate("/live-streams");
      }
    } catch (err) {
      toast.error("Failed to load replay");
      navigate("/live-streams");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await liveStreamService.getMessages(id);
      if (res.success) setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveVideoUrl = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }
    setSaving(true);
    try {
      const res = await liveStreamService.setVideoUrl(id, videoUrl.trim());
      if (res.success) {
        toast.success("Recording URL saved");
        setShowInput(false);
      } else {
        toast.error(res.message || "Failed to save");
      }
    } catch (err) {
      toast.error("Error saving recording URL");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) return null;

  const isOwner = user && parseInt(stream.musician_id) === parseInt(user.id);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      <div className="mb-4">
        <Link to="/live-streams" className="text-xs font-semibold text-slate-500 hover:text-white flex items-center gap-1.5 transition">
          ← Back to Live Streams
        </Link>
      </div>

      {/* Replay Video Player */}
      <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-2xl flex flex-col items-center justify-center">
        {videoUrl ? (
          videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
            <iframe
              src={videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
              title="Stream Replay"
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          ) : videoUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) ? (
            <video
              controls
              className="w-full h-full object-contain bg-black"
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={videoUrl}
              title="Stream Replay"
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          )
        ) : (
          <div className="text-center p-8">
            <div className="text-5xl mb-4">📹</div>
            <h3 className="text-xl font-extrabold text-white">Recording Not Available</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              No replay recording has been uploaded for this stream yet.
            </p>
          </div>
        )}

        <div className="absolute top-4 left-4 flex gap-2 z-20">
          <span className="flex items-center gap-1 bg-slate-700 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow">
            REPLAY
          </span>
          <span className="bg-black/80 text-white text-[9px] px-2 py-0.5 rounded shadow flex items-center gap-1">
            👥 {stream.viewer_count || 0} watched
          </span>
        </div>
      </div>

      {/* Stream Info */}
      <div className="mt-4 p-5 rounded-3xl glass-dark">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
              {stream.musician_name}
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">{stream.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Streamed on {new Date(stream.created_at).toLocaleDateString()} · Ended
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              {!showInput ? (
                <button
                  onClick={() => setShowInput(true)}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-xl font-bold transition active:scale-95"
                >
                  {videoUrl ? "Change Recording URL" : "Add Recording URL"}
                </button>
              ) : (
                <button
                  onClick={() => { setShowInput(false); setVideoUrl(stream.video_url || ""); }}
                  className="bg-white/5 hover:bg-white/10 text-slate-400 text-xs px-4 py-2 rounded-xl font-bold transition active:scale-95"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          {stream.description || "Replay of a live stream on ZemaLink."}
        </p>
      </div>

      {/* Video URL Input (owner only) */}
      {isOwner && showInput && (
        <div className="mt-4 p-4 rounded-3xl glass-dark border border-white/[0.06]">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Recording Video URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://example.com/recording.mp4"
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all"
            />
            <button
              onClick={handleSaveVideoUrl}
              disabled={saving}
              className="bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Supports YouTube links, direct MP4/WebM URLs, or any embeddable video URL.
          </p>
        </div>
      )}

      {/* Chat Replay */}
      <div className="mt-6">
        <div className="rounded-3xl glass-dark overflow-hidden max-h-[500px] flex flex-col">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              💬 Chat Replay ({messages.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth custom-scroll">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs p-4">
                No chat messages from this stream.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                    <span className="font-bold text-white/80">{msg.user_name}</span>
                    <span className="text-[9px] text-slate-500 ml-auto">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-300 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 rounded-xl inline-block max-w-full break-words">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReplayPage;
