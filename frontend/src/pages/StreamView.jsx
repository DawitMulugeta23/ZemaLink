import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { liveStreamService } from "../services/liveStreamService";
import { toast } from "react-toastify";

const MOCK_CHATTERS = [
  { name: "Aster_M", role: "audience", subscription: "premium" },
  { name: "Zelalem_K", role: "audience", subscription: "free" },
  { name: "Selam_Ad", role: "audience", subscription: "premium" },
  { name: "Dawit_Z", role: "audience", subscription: "free" },
  { name: "music_lover_99", role: "audience", subscription: "premium" },
  { name: "Chala_B", role: "audience", subscription: "free" },
  { name: "Betty_G", role: "musician", subscription: "premium" },
  { name: "Yosef_Al", role: "audience", subscription: "free" }
];

const MOCK_COMMENTS = [
  "Wow, this is legendary! 🔥",
  "Beautiful melody, loving the acoustics.",
  "Love from Addis Ababa! 🇪🇹",
  "Which guitar is that? Sounds amazing!",
  "Amazing voice! 👏❤️",
  "ZemaLink streams are the best!",
  "Is this live show going to be recorded?",
  "Yes! Play that one next! 🎵🎸",
  "So cozy... vibes are immaculate.",
  "🎉🎉🎉",
  "Mind-blowing skills on the keys!",
  "Greetings from Hawassa! 🌊🎵",
  "Incredible performance, thank you!",
  "My favorite song! ❤️❤️❤️"
];

function StreamView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewers, setViewers] = useState(0);
  const [relatedStreams, setRelatedStreams] = useState([]);
  const [customStreamUrl, setCustomStreamUrl] = useState("");

  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatSimInterval = useRef(null);
  const messageFetchInterval = useRef(null);
  const visualizerAnimation = useRef(null);
  const pollRef = useRef(null);

  const loadStream = async () => {
    try {
      const res = await liveStreamService.getStreamDetails(id);
      if (res.success) {
        setStream(res.stream);
        setHasAccess(res.stream.has_access);
        setViewers(res.stream.viewer_count || 0);
        if (res.stream.has_access) loadMessages();
      } else {
        toast.error(res.message || "Failed to load stream details");
        navigate("/live-streams");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred loading the stream");
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

  const loadRelatedStreams = async () => {
    try {
      const res = await liveStreamService.getAllStreams();
      if (res.success) {
        setRelatedStreams((res.streams || []).filter((s) => String(s.id) !== String(id)).slice(0, 4));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStream();
    loadRelatedStreams();
    return () => {
      clearInterval(chatSimInterval.current);
      clearInterval(messageFetchInterval.current);
      clearInterval(pollRef.current);
      cancelAnimationFrame(visualizerAnimation.current);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (stream && stream.status === "live" && hasAccess) {
      messageFetchInterval.current = setInterval(loadMessages, 5000);
      chatSimInterval.current = setInterval(() => {
        const rChatter = MOCK_CHATTERS[Math.floor(Math.random() * MOCK_CHATTERS.length)];
        const rComment = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
        setMessages(prev => [...prev, {
          id: "mock_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          stream_id: id, user_id: 0, user_name: rChatter.name,
          user_role: rChatter.role, user_subscription: rChatter.subscription,
          message: rComment, created_at: new Date().toISOString()
        }]);
        setViewers(prev => Math.max(5, prev + (Math.random() > 0.5 ? 1 : -1)));
      }, Math.random() * 4000 + 3500);
      startVisualizer();
    } else {
      clearInterval(chatSimInterval.current);
      clearInterval(messageFetchInterval.current);
      cancelAnimationFrame(visualizerAnimation.current);
    }
  }, [stream, hasAccess]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await liveStreamService.sendMessage(id, newMessage);
      if (res.success) {
        setMessages(prev => [...prev, {
          id: "user_" + Date.now(), stream_id: id, user_id: user.id,
          user_name: user.name, user_role: user.role,
          user_subscription: user.subscription_status || "free",
          message: newMessage, created_at: new Date().toISOString()
        }]);
        setNewMessage("");
      } else {
        toast.error(res.message || "Failed to send message");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending message");
    }
  };

  const handleStartStream = async () => {
    try {
      const res = await liveStreamService.updateStatus(id, "live", customStreamUrl);
      if (res.success) {
        toast.success("You are now LIVE! 📡");
        loadStream();
      } else {
        toast.error(res.message || "Failed to start stream");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error starting stream");
    }
  };

  const handleEndStream = async () => {
    if (!confirm("Are you sure you want to end this live stream?")) return;
    try {
      const res = await liveStreamService.updateStatus(id, "ended");
      if (res.success) {
        toast.info("Stream has been ended.");
        loadStream();
      } else {
        toast.error(res.message || "Failed to end stream");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error ending stream");
    }
  };

  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 400;
    const parent = canvas.parentElement;
    const bars = Array.from({ length: 45 }, (_, i) => ({
      x: (canvas.width / 45) * i,
      width: (canvas.width / 45) - 4,
      height: 20 + Math.random() * 80,
      targetHeight: 20 + Math.random() * 80,
      speed: 0.15 + Math.random() * 0.08
    }));
    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.9)");
      gradient.addColorStop(0.5, "rgba(236, 72, 153, 0.7)");
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.2)");
      ctx.fillStyle = gradient;
      bars.forEach(bar => {
        bar.height += (bar.targetHeight - bar.height) * bar.speed;
        ctx.fillRect(bar.x + 2, canvas.height - bar.height, bar.width, bar.height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bar.x + 2, canvas.height - bar.height, bar.width, 3);
        ctx.fillStyle = gradient;
        if (Math.abs(bar.targetHeight - bar.height) < 4) {
          bar.targetHeight = 15 + Math.random() * (canvas.height * 0.75);
        }
      });
      visualizerAnimation.current = requestAnimationFrame(draw);
    };
    draw();
    const handleResize = () => {
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight || 400;
      }
    };
    window.addEventListener("resize", handleResize);
  };

  const intval = (val) => parseInt(val) || 0;

  const isCreator = stream && intval(stream.musician_id) === intval(user?.id);

  const countdown = useMemo(() => {
    if (!stream || stream.status !== "scheduled" || !stream.scheduled_at) return null;
    const diff = new Date(stream.scheduled_at) - new Date();
    if (diff <= 0) return "Starting soon...";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [stream]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl glass-dark text-center">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-black mt-4 text-white">Ticket Required</h2>
        <p className="text-sm text-slate-400 mt-2">
          This live stream requires a concert ticket. Purchase one from the Events page.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/events" className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg hover:shadow-primary-500/25 active:scale-95 transition">
            Buy Concert Ticket
          </Link>
          <Link to="/live-streams" className="w-full bg-white/5 text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-white/10 active:scale-95 transition border border-white/10">
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-4">
        <Link to="/live-streams" className="text-xs font-semibold text-slate-500 hover:text-white flex items-center gap-1.5 transition">
          ← Back to Live Streams
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col">
          <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-2xl flex flex-col items-center justify-center">
            {stream.status === "scheduled" && (
              <div className="text-center p-8">
                <div className="text-5xl animate-bounce inline-block">⏳</div>
                <h3 className="text-2xl font-extrabold text-white mt-4">Stream Starting Soon</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Countdown: <strong className="text-red-400 text-lg block mt-1">{countdown}</strong>
                </p>
                <p className="text-slate-500 text-xs mt-3">
                  Scheduled: {new Date(stream.scheduled_at).toLocaleString()}
                </p>
                {isCreator && (
                  <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
                    <input
                      type="text"
                      placeholder="Optional embed/YouTube link"
                      value={customStreamUrl}
                      onChange={(e) => setCustomStreamUrl(e.target.value)}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleStartStream}
                      className="bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl py-2 px-6 text-xs font-bold shadow-lg hover:shadow-primary-500/25 active:scale-95 transition"
                    >
                      Start Stream & Go LIVE
                    </button>
                  </div>
                )}
              </div>
            )}

            {stream.status === "ended" && (
              <div className="text-center p-8">
                <div className="text-5xl">🛑</div>
                <h3 className="text-2xl font-extrabold text-white mt-4">Stream Has Ended</h3>
                <p className="text-slate-400 text-sm mt-2">Thanks for tuning in! The concert performance is completed.</p>
              </div>
            )}

            {stream.status === "live" && (
              <div className="absolute inset-0 w-full h-full">
                {stream.stream_url ? (
                  <iframe
                    src={stream.stream_url.replace("watch?v=", "embed/")}
                    title="Live Stream Frame"
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <div className="relative w-full h-full bg-gradient-to-b from-gray-900 via-gray-950 to-black flex items-end">
                    <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10">
                      <div className="w-24 h-24 mx-auto rounded-full bg-red-500/25 animate-ping absolute inset-0" />
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-lg relative">
                        <span className="text-3xl">🎤</span>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-white/50 block mt-4 font-semibold">
                        Broadcasting Live Audio Feed
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                  <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    LIVE
                  </span>
                  <span className="bg-black/80 text-white text-[9px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                    👥 {viewers} watching
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-5 rounded-3xl glass-dark">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
                  {stream.musician_name}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{stream.title}</h2>
              </div>
              {isCreator && stream.status === "live" && (
                <button
                  type="button"
                  onClick={handleEndStream}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition"
                >
                  End Stream
                </button>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              {stream.description || "Tune in for this exciting music live stream event hosted on ZemaLink."}
            </p>
          </div>
        </div>

        <div className="flex flex-col h-[500px] lg:h-auto rounded-3xl glass-dark overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-red-500 text-base">💬</span>
              Live Chat
            </h3>
            {stream.ticket_required == 1 && (
              <span className="text-[10px] text-pink-400 font-semibold bg-pink-500/10 px-2.5 py-1 rounded-md border border-pink-500/20">
                🎫 Ticket Only
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth custom-scroll">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs p-4">
                No chat messages yet. <br /> Be the first to say hello!
              </div>
            ) : (
              messages.map((msg) => {
                const isHost = intval(msg.user_id) === intval(stream.musician_id) || msg.user_role === "musician";
                const isPremium = msg.user_subscription === "premium";
                return (
                  <div key={msg.id} className="text-xs">
                    <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                      {isHost && (
                        <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-extrabold text-[8px] px-1.5 py-0.5 rounded leading-none">HOST</span>
                      )}
                      {!isHost && isPremium && (
                        <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded leading-none">PRO</span>
                      )}
                      <span className={`font-bold ${isHost ? "text-yellow-400" : isPremium ? "text-pink-300" : "text-white/80"}`}>
                        {msg.user_name}
                      </span>
                      <span className="text-[9px] text-slate-500 ml-auto">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-300 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5 rounded-xl rounded-tl-none inline-block max-w-full break-words">
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.06] bg-black/25 flex gap-2">
            <input
              type="text"
              placeholder="Send a comment..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all duration-300"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-primary-500 to-accent-500 hover:shadow-lg text-white font-bold text-xs p-2.5 rounded-xl transition active:scale-95 flex items-center justify-center aspect-square"
              aria-label="Send Message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      </div>

      {relatedStreams.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-white mb-4">Other Streams</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {relatedStreams.map((rs) => (
              <Link
                key={rs.id}
                to={`/live-streams/${rs.id}`}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black/40">
                  <img
                    src={rs.cover_image || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=200"}
                    alt={rs.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=200"; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{rs.title}</p>
                  <p className="text-xs text-slate-500 truncate">{rs.musician_name}</p>
                </div>
                {rs.status === "live" && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StreamView;
