import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { liveStreamService } from "../services/liveStreamService";
import { eventService } from "../services/eventService";
import { toast } from "react-toastify";

function LiveStreams() {
  const { user } = useAuth();
  const [streams, setStreams] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const loadData = async (showToast = false) => {
    try {
      const res = await liveStreamService.getAllStreams();
      if (res.success) setStreams(res.streams || []);
      if (showToast && !loading) setLoading(false);
      if (user) {
        const ticketRes = await eventService.getUserTickets();
        if (ticketRes.success) setUserTickets(ticketRes.tickets || []);
      }
    } catch (err) {
      console.error(err);
      if (showToast) toast.error("Failed to load streams");
    } finally {
      if (showToast) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    pollRef.current = setInterval(() => loadData(false), 30000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const { liveStreams, upcomingStreams, endedStreams } = useMemo(() => {
    const live = [];
    const upcoming = [];
    const ended = [];
    const now = new Date().toISOString();
    streams.forEach((s) => {
      if (s.status === "live") live.push(s);
      else if (s.status === "ended") ended.push(s);
      else if (s.status === "scheduled" || s.status === "upcoming") {
        if (s.scheduled_at && s.scheduled_at <= now) live.push(s);
        else upcoming.push(s);
      }
    });
    return { liveStreams: live, upcomingStreams: upcoming, endedStreams: ended };
  }, [streams]);

  const formatScheduledTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs > 0 && diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      if (hours > 0) return `In ${hours}h ${mins}m`;
      return `In ${mins}m`;
    }
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", weekday: "short"
    });
  };

  const renderStreamCard = (stream) => {
    const isLive = stream.status === "live";
    const isEnded = stream.status === "ended";
    const ticketRequired = stream.ticket_required == 1;
    const hasTicket = userTickets.some(t => String(t.event_id) === String(stream.event_id));
    const needsTicket = ticketRequired && !hasTicket && String(stream.musician_id) !== String(user?.id);

    return (
      <div
        key={stream.id}
        className="group relative flex flex-col rounded-3xl glass-dark overflow-hidden hover:border-red-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
          <img
            src={stream.cover_image || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800"}
            alt={stream.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800"; }}
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {isLive ? (
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md shadow-md">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                LIVE
              </span>
            ) : isEnded ? (
              <span className="bg-slate-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md shadow-md">
                Ended
              </span>
            ) : (
              <span className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md shadow-md">
                Scheduled
              </span>
            )}
            {ticketRequired && (
              <span className="bg-pink-600 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md shadow-md">
                🎫 Ticket
              </span>
            )}
          </div>
          {isLive && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1.5 font-semibold">
              <span>👥</span> {stream.viewer_count || 0} watching
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col p-5">
          <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
            {stream.musician_name}
          </span>
          <h3 className="text-lg font-bold text-white mt-1 group-hover:text-red-400 transition-colors line-clamp-1">
            {stream.title}
          </h3>
          <p className="text-sm text-slate-400 mt-2 line-clamp-2 min-h-10">
            {stream.description || "Tune in for a gorgeous music performance."}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
            <div className="text-xs text-slate-500">
              {isLive ? (
                <span className="text-red-400 font-bold">Started live</span>
              ) : isEnded ? (
                <span>Ended</span>
              ) : (
                <span>Starts: {formatScheduledTime(stream.scheduled_at)}</span>
              )}
            </div>
            {needsTicket ? (
              <Link
                to="/events"
                className="bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md hover:shadow-pink-500/25 transition-all duration-300"
              >
                Buy Ticket
              </Link>
            ) : isEnded ? (
              <Link
                to={`/live-streams/${stream.id}`}
                className="rounded-xl px-4 py-2 text-xs font-bold transition bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
              >
                Watch Replay
              </Link>
            ) : (
              <Link
                to={`/live-streams/${stream.id}`}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 ${
                  isLive
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20"
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {isLive ? "Join Stream" : "Enter Lobby"}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold gradient-text">
            Live Streams
          </h1>
          <p className="text-slate-400 text-sm mt-1">Loading streams...</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl glass-dark overflow-hidden animate-pulse">
              <div className="aspect-[16/9] bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-white/5 rounded w-1/4" />
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const Section = ({ title, icon, streams, emptyMsg }) => (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-lg">{icon}</span>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <span className="text-xs text-slate-500 font-medium bg-white/5 px-2.5 py-0.5 rounded-full">{streams.length}</span>
      </div>
      {streams.length === 0 ? (
        <div className="rounded-3xl glass-dark p-10 text-center">
          <p className="text-slate-400 text-sm">{emptyMsg}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {streams.map(renderStreamCard)}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold gradient-text">
          Live Streams
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tune in live to watch your favorite artists, chat with fans, and join interactive events
        </p>
      </div>

      <Section
        title="Live Now"
        icon="🔴"
        streams={liveStreams}
        emptyMsg="No live streams at the moment. Check back soon!"
      />
      <Section
        title="Upcoming"
        icon="📅"
        streams={upcomingStreams}
        emptyMsg="No upcoming streams scheduled."
      />
      <Section
        title="Ended"
        icon="⏹️"
        streams={endedStreams}
        emptyMsg="No ended streams."
      />
    </div>
  );
}

export default LiveStreams;
