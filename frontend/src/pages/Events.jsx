import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { eventService } from "../services/eventService";
import { toast } from "react-toastify";

function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("all-events");
  const [timeFilter, setTimeFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [buying, setBuying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const allEv = await eventService.getAllEvents();
      if (allEv.success) setEvents(allEv.events || []);
      if (user) {
        const ticketsRes = await eventService.getUserTickets();
        if (ticketsRes.success) setMyTickets(ticketsRes.tickets || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const now = useMemo(() => new Date().toISOString(), []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const evDate = ev.event_date || ev.scheduled_at;
      if (timeFilter === "upcoming") return evDate >= now;
      return evDate < now;
    });
  }, [events, timeFilter, now]);

  const handleBuyMock = async (eventId) => {
    if (!user) { toast.info("Please log in to purchase tickets"); return; }
    setBuying(true);
    try {
      const res = await eventService.purchaseTicketMock(eventId);
      if (res.success) {
        toast.success(res.message || "Ticket purchased successfully!");
        setSelectedEvent(null);
        loadData();
      } else {
        toast.error(res.message || "Failed to buy ticket");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during checkout");
    } finally {
      setBuying(false);
    }
  };

  const handleBuyChapa = async (eventId) => {
    if (!user) { toast.info("Please log in to purchase tickets"); return; }
    setBuying(true);
    try {
      const returnUrl = window.location.origin + "/events?status=success";
      const res = await eventService.initiateTicketPayment(eventId, returnUrl);
      if (res.success) {
        if (res.already_purchased) {
          toast.info("You already own a ticket for this event");
          setSelectedEvent(null);
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
      setBuying(false);
    }
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text">
            Events & Concerts
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Get access to physical live shows and exclusive online music streams
          </p>
        </div>
        {user && (
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10 self-start sm:self-center">
            <button
              onClick={() => setActiveTab("all-events")}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                activeTab === "all-events"
                  ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab("my-tickets")}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                activeTab === "my-tickets"
                  ? "bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              My Tickets ({myTickets.length})
            </button>
          </div>
        )}
      </div>

      {activeTab === "all-events" && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTimeFilter("upcoming")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              timeFilter === "upcoming"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setTimeFilter("past")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              timeFilter === "past"
                ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:text-white"
            }`}
          >
            Past
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-white/5 border-t-red-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === "all-events" ? (
        filteredEvents.length === 0 ? (
          <div className="text-center py-20 rounded-3xl glass-dark">
            <div className="text-5xl mb-4">🎫</div>
            <h3 className="text-xl font-bold text-white mt-4">
              {timeFilter === "upcoming" ? "No upcoming events" : "No past events"}
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              {timeFilter === "upcoming" ? "Check back later for exciting music concerts" : "Past events will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => {
              const hasTicket = myTickets.some(t => String(t.event_id) === String(ev.id));
              const isSoldOut = ev.tickets_sold >= ev.total_tickets;
              const evDate = new Date(ev.event_date || ev.scheduled_at);
              const isPast = evDate < new Date();
              return (
                <div
                  key={ev.id}
                  className="group relative flex flex-col rounded-3xl glass-dark overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg hover:border-red-500/30 hover:shadow-red-500/10"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/30">
                    <img
                      src={ev.cover_image || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800"}
                      alt={ev.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800"; }}
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      {ev.is_live_stream == 1 && (
                        <span className="bg-red-500/90 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md">
                          📡 Live Stream
                        </span>
                      )}
                      {hasTicket && (
                        <span className="bg-emerald-500/90 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md">
                          ✓ Purchased
                        </span>
                      )}
                      {isPast && (
                        <span className="bg-slate-500/90 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md">
                          Ended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col p-5">
                    <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
                      {ev.musician_name}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1 group-hover:text-red-400 transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                      <span>📅</span> {formatDateTime(ev.event_date || ev.scheduled_at)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 line-clamp-1">
                      <span>📍</span> {ev.location}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Price</span>
                        <span className="text-lg font-extrabold text-white">
                          {parseFloat(ev.ticket_price) === 0 ? "FREE" : `${Number(ev.ticket_price).toFixed(2)} ETB`}
                        </span>
                      </div>
                      {isPast ? (
                        <span className="text-xs text-slate-500 font-medium">Ended</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                            hasTicket
                              ? "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                              : isSoldOut
                              ? "bg-white/5 text-slate-500 cursor-not-allowed"
: "bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg hover:shadow-primary-500/25"
                        }`}
                      >
                        {hasTicket ? "View Ticket" : isSoldOut ? "Sold Out" : "Buy Ticket"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        myTickets.length === 0 ? (
          <div className="text-center py-20 rounded-3xl glass-dark">
            <div className="text-5xl mb-4">🎟️</div>
            <h3 className="text-xl font-bold text-white mt-4">No purchased tickets</h3>
            <p className="text-slate-400 text-sm mt-2">Tickets you buy for upcoming events will appear here</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {myTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="relative flex flex-col sm:flex-row rounded-3xl glass-dark overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex-1 p-6 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-white/[0.06] border-dashed">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                        {tkt.musician_name}
                      </span>
                      {tkt.is_live_stream == 1 && (
                        <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] uppercase px-2 py-0.5 rounded font-medium">
                          📡 Streaming
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1 line-clamp-1">{tkt.event_title}</h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>📅</span>
                        <span>{formatDateTime(tkt.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>📍</span>
                        <span className="line-clamp-1">{tkt.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>CODE: {tkt.ticket_code}</span>
                    <span>ISSUED: {new Date(tkt.purchased_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="w-full sm:w-44 bg-black/20 flex flex-col justify-center items-center p-6 gap-3">
                  <div className="bg-white p-2.5 rounded-2xl shadow-inner relative group">
                    <div className="w-28 h-28 bg-gray-100 flex flex-wrap justify-between p-1.5 border border-gray-300 rounded-lg overflow-hidden">
                      {[...Array(16)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1/4 h-1/4 ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-gray-200'} ${i % 4 === 0 || i % 4 === 3 ? 'border-2 border-white' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 tracking-widest text-center uppercase">
                    Scan At Entrance
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl glass-dark p-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-white/5 w-8 h-8 rounded-full flex items-center justify-center border border-white/10"
            >
              ✕
            </button>
            <div className="mb-4">
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest block">
                {selectedEvent.musician_name}
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{selectedEvent.title}</h2>
            </div>
            <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-4 bg-black/40 border border-white/[0.06]">
              <img
                src={selectedEvent.cover_image || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800"}
                alt={selectedEvent.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800"; }}
              />
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-400 leading-relaxed max-h-24 overflow-y-auto pr-1">
                {selectedEvent.description || "No description provided for this event."}
              </p>
              <div className="grid grid-cols-2 gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Date & Time</span>
                  <span className="text-xs font-semibold text-white">{formatDateTime(selectedEvent.event_date || selectedEvent.scheduled_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Venue / Location</span>
                  <span className="text-xs font-semibold text-white line-clamp-1">{selectedEvent.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Tickets Sold</span>
                  <span className="text-xs font-semibold text-white">{selectedEvent.tickets_sold} / {selectedEvent.total_tickets}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ticket Price</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {parseFloat(selectedEvent.ticket_price) === 0 ? "FREE" : `${Number(selectedEvent.ticket_price).toFixed(2)} ETB`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {myTickets.some(t => String(t.event_id) === String(selectedEvent.id)) ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center text-emerald-300 font-semibold text-sm">
                  ✓ You already have a ticket
                </div>
              ) : selectedEvent.tickets_sold >= selectedEvent.total_tickets ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center text-slate-400 font-semibold text-sm">
                  This event is fully booked.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={buying}
                    onClick={() => handleBuyMock(selectedEvent.id)}
                    className="bg-white/5 border border-white/10 text-white rounded-2xl py-3.5 text-sm font-bold hover:bg-white/10 active:scale-95 transition-all duration-300 disabled:opacity-50"
                  >
                    {buying ? "Processing..." : "Mock Checkout"}
                  </button>
                  <button
                    type="button"
                    disabled={buying || parseFloat(selectedEvent.ticket_price) === 0}
                    onClick={() => handleBuyChapa(selectedEvent.id)}
                    className={`rounded-2xl py-3.5 text-sm font-bold active:scale-95 transition-all duration-300 disabled:opacity-50 ${
                      parseFloat(selectedEvent.ticket_price) === 0
                        ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/10"
                        : "bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg hover:shadow-primary-500/25"
                      }`}
                    >
                      {buying ? "Processing..." : "Pay with Chapa"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
