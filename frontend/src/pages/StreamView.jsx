import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { liveStreamService } from "../services/liveStreamService";
import { eventService } from "../services/eventService";
import { paymentService } from "../services/paymentService";
import { toast } from "react-toastify";
import ConfirmDialog from "../components/common/ConfirmDialog";
import MockCheckoutModal from "../components/payment/MockCheckoutModal";

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

  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [ticketEvent, setTicketEvent] = useState(null);
  const [showMockModal, setShowMockModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [joined, setJoined] = useState(false);

  const videoRef = useRef(null);
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
      if (isCreator) {
        // Creator manually enables camera
      } else {
        startVisualizer();
      }
      startChatSimulation();
    } else {
      clearInterval(chatSimInterval.current);
      clearInterval(messageFetchInterval.current);
      cancelAnimationFrame(visualizerAnimation.current);
    }
  }, [stream?.status, hasAccess]);

  // Poll stream status when not live (for viewers waiting for start)
  useEffect(() => {
    if (!stream || stream.status === "live" || stream.status === "ended" || !hasAccess) return;
    const interval = setInterval(() => {
      liveStreamService.getStreamDetails(id).then(res => {
        if (res.success && res.stream) {
          setStream(res.stream);
          setViewers(res.stream.viewer_count || 0);
        }
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [id, stream?.status, hasAccess]);

  const startChatSimulation = () => {
    clearInterval(chatSimInterval.current);
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
  };

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

  const handleEndStream = async () => {
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

  const handleStartStream = async () => {
    try {
      const res = await liveStreamService.updateStatus(id, "live");
      if (res.success) {
        toast.success("Stream is now live!");
        loadStream();
      } else {
        toast.error(res.message || "Failed to start stream");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error starting stream");
    }
  };

  const handleJoinStream = async () => {
    try {
      const res = await liveStreamService.updateStatus(id, "join");
      if (res.success) {
        setJoined(true);
        setViewers(res.viewer_count || viewers + 1);
        toast.success("Joined the stream");
      } else {
        toast.error(res.message || "Failed to join");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error joining stream");
    }
  };

  const handleLeaveStream = async () => {
    try {
      const res = await liveStreamService.updateStatus(id, "leave");
      if (res.success) {
        setJoined(false);
        setViewers(Math.max(0, res.viewer_count || viewers - 1));
        toast.info("Left the stream");
      } else {
        toast.error(res.message || "Failed to leave");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error leaving stream");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/live-streams/${id}`;
    const shareText = `🎵 Tune in to "${stream.title}" live on ZemaLink!`;
    if (navigator.share) {
      navigator.share({ title: stream.title, text: shareText, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${url}`)
        .then(() => toast.success("Invite link copied!"))
        .catch(() => toast.error("Failed to copy link"));
    }
  };

  const handleBuyMockTicket = async () => {
    if (!user) { toast.info("Please log in to purchase tickets"); return; }
    if (!ticketEvent) return;
    setShowMockModal(true);
  };

  const handleMockPay = async (accountData) => {
    if (!ticketEvent) return;
    const res = await paymentService.mockPurchaseTicket(ticketEvent.id, accountData);
    if (res.success) {
      setShowMockModal(false);
      toast.success("Ticket purchased! You can now join the stream.");
      loadStream();
    } else {
      throw new Error(res.message || "Failed to buy ticket");
    }
  };

  const handleBuyChapaTicket = async () => {
    if (!user) { toast.info("Please log in to purchase tickets"); return; }
    if (!ticketEvent) return;
    setBuyingTicket(true);
    try {
      const returnUrl = window.location.origin + `/live-streams/${id}?purchased=1`;
      const res = await eventService.initiateTicketPayment(ticketEvent.id, returnUrl);
      if (res.success) {
        if (res.already_purchased) {
          toast.info("You already own a ticket for this event");
          loadStream();
        } else if (res.chapa?.data?.checkout_url) {
          window.location.href = res.chapa.data.checkout_url;
        } else {
          toast.error("Could not retrieve checkout URL");
        }
      } else {
        toast.error(res.message || "Failed to initiate payment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Payment initialization failed");
    } finally {
      setBuyingTicket(false);
    }
  };

  useEffect(() => {
    if (stream && stream.ticket_required && !hasAccess && stream.event_id) {
      eventService.getEventDetails(stream.event_id)
        .then(res => { if (res.success) setTicketEvent(res.event); })
        .catch(() => {});
    }
  }, [stream, hasAccess]);

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

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setCameraStream(stream);
      setCameraEnabled(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera permissions to stream.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Could not access camera: " + err.message);
      }
      setCameraEnabled(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraEnabled(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const intval = (val) => parseInt(val) || 0;

  const isCreator = stream && intval(stream.musician_id) === intval(user?.id);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess && stream && stream.ticket_required) {
    const isSoldOut = ticketEvent && ticketEvent.tickets_sold >= ticketEvent.total_tickets;
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl glass-dark text-center">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-black mt-4 text-white">Ticket Required</h2>
        <p className="text-sm text-slate-400 mt-2">
          This live stream requires a concert ticket to join.
        </p>
        {ticketEvent && (
          <div className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-left space-y-2">
            <p className="text-sm text-white font-bold">{ticketEvent.title}</p>
            <p className="text-xs text-slate-400">
              <span className="text-slate-500">Price:</span>{" "}
              {parseFloat(ticketEvent.ticket_price) === 0 ? "FREE" : `${Number(ticketEvent.ticket_price).toFixed(2)} ETB`}
            </p>
            <p className="text-xs text-slate-400">
              <span className="text-slate-500">Tickets:</span>{" "}
              {ticketEvent.tickets_sold}/{ticketEvent.total_tickets} sold
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3">
          {user ? (
            isSoldOut ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-slate-400 text-sm">
                This event is fully booked.
              </div>
            ) : (
              <>
                <button
                  onClick={handleBuyMockTicket}
                  disabled={buyingTicket}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-white/10 active:scale-95 transition disabled:opacity-50"
                >
                  {buyingTicket ? "Processing..." : "Mock Checkout"}
                </button>
                {ticketEvent && parseFloat(ticketEvent.ticket_price) > 0 && (
                  <button
                    onClick={handleBuyChapaTicket}
                    disabled={buyingTicket}
                    className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg hover:shadow-primary-500/25 active:scale-95 transition disabled:opacity-50"
                  >
                    {buyingTicket ? "Processing..." : "Pay with Chapa"}
                  </button>
                )}
              </>
            )
          ) : (
            <Link to="/login" className="w-full bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl py-3.5 text-sm font-bold shadow-lg hover:shadow-primary-500/25 active:scale-95 transition">
              Log In to Purchase
            </Link>
          )}
          <Link to="/live-streams" className="w-full bg-white/5 text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-white/10 active:scale-95 transition border border-white/10">
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      <div className="mb-4">
        <Link to="/live-streams" className="text-xs font-semibold text-slate-500 hover:text-white flex items-center gap-1.5 transition">
          ← Back to Live Streams
        </Link>
      </div>

      {/* ───── STREAM PLAYER ───── */}
      <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-2xl flex flex-col items-center justify-center">
        {stream.status === "pending" && (
          <div className="text-center p-8">
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-2xl font-extrabold text-white mt-4">Stream Not Started</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
              {isCreator ? "Click 'Start Live' when you're ready to begin broadcasting." : "The streamer hasn't started yet. Check back soon!"}
            </p>
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
            {cameraEnabled && isCreator ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : stream.stream_url ? (
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
                    {isCreator ? (cameraError || "Enable camera to start broadcasting") : "📡 Live audio feed"}
                  </span>
                </div>
              </div>
            )}
            {/* Status badges */}
            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                LIVE
              </span>
              <span className="bg-black/70 text-white text-[9px] px-2 py-0.5 rounded shadow">
                👥 {viewers}
              </span>
            </div>
            {isCreator && (
              <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                <button
                  onClick={cameraEnabled ? stopCamera : startCamera}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg transition active:scale-95 ${
                    cameraEnabled
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : cameraError
                        ? "bg-red-600/80 text-white hover:bg-red-700"
                        : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <span>📷</span>
                  {cameraEnabled ? "Camera On" : cameraError ? "Camera Error" : "Enable Camera"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───── STREAM INFO + ACTIONS ───── */}
      <div className="mt-4 p-5 rounded-3xl glass-dark">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
              {stream.musician_name}
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">{stream.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCreator && stream.status === "pending" && (
              <button
                onClick={() => setShowConfirmStart(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition"
              >
                Start Live
              </button>
            )}
            {isCreator && stream.status === "live" && (
              <button
                onClick={() => setShowConfirmEnd(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition"
              >
                End Stream
              </button>
            )}
            {!isCreator && stream.status === "live" && (
              joined ? (
                <button
                  onClick={handleLeaveStream}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition"
                >
                  Leave Stream
                </button>
              ) : (
                <button
                  onClick={handleJoinStream}
                  className="bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition shadow-lg"
                >
                  Join Stream
                </button>
              )
            )}
            <button
              onClick={handleShare}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-xl font-bold transition active:scale-95 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {navigator.share ? "Invite" : "Copy Link"}
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          {stream.description || "Tune in for this exciting music live stream event hosted on ZemaLink."}
        </p>
      </div>

      {/* ───── CHAT + RELATED STREAMS ───── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 flex flex-col rounded-3xl glass-dark overflow-hidden max-h-[600px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-red-500 text-base">💬</span>
              Live Chat
              <span className="text-xs text-slate-500 font-medium ml-1">({messages.length})</span>
            </h3>
            {stream.ticket_required == 1 && (
              <span className="text-[10px] text-pink-400 font-semibold bg-pink-500/10 px-2.5 py-1 rounded-md border border-pink-500/20">
                🎫 Ticket Only
              </span>
            )}
          </div>

          {/* Messages */}
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

          {/* Message Input */}
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

        {/* Related Streams Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl glass-dark p-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
              <span>📡</span> Other Streams
            </h3>
            {relatedStreams.length === 0 ? (
              <p className="text-xs text-slate-500">No other streams right now.</p>
            ) : (
              <div className="space-y-3">
                {relatedStreams.map((rs) => (
                  <Link
                    key={rs.id}
                    to={`/live-streams/${rs.id}`}
                    className="group flex items-center gap-3 p-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black/40">
                      <img
                        src={rs.cover_image || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=200"}
                        alt={rs.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=200"; }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{rs.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{rs.musician_name}</p>
                    </div>
                    {rs.status === "live" && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmStart}
        onClose={() => setShowConfirmStart(false)}
        onConfirm={handleStartStream}
        title="Start Live Stream"
        message="Are you sure you want to start this live stream? Viewers will be able to join."
        confirmText="Start Stream"
        cancelText="Cancel"
        variant="primary"
      />
      <ConfirmDialog
        isOpen={showConfirmEnd}
        onClose={() => setShowConfirmEnd(false)}
        onConfirm={handleEndStream}
        title="End Live Stream"
        message="Are you sure you want to end this live stream?"
        confirmText="End Stream"
        cancelText="Cancel"
        variant="danger"
      />

      <MockCheckoutModal
        isOpen={showMockModal}
        onClose={() => setShowMockModal(false)}
        itemType="ticket"
        itemId={ticketEvent?.id}
        itemName={ticketEvent?.title}
        amount={ticketEvent?.ticket_price}
        onPay={handleMockPay}
      />
    </div>
  );
}

export default StreamView;
