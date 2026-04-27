import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { songService } from "../services/songService";

function ProDeal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { playSong } = usePlayer();
  const [busy, setBusy] = useState(false);
  const [song, setSong] = useState(null);
  const [msg, setMsg] = useState("");
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const songId = useMemo(() => {
    const raw = query.get("songId");
    return raw ? Number(raw) : 0;
  }, [query]);

  const loadSong = useCallback(async () => {
    setBusy(true);
    setMsg("");
    try {
      const songs = await songService.getSongs();
      const found = songs.find((s) => Number(s.id) === songId);
      
      if (!found) {
        setMsg("This premium track was not found.");
        return;
      }
      
      // Check if user already purchased this song
      if (user) {
        const purchasedSongs = await songService.getPurchasedSongs();
        const isPurchased = purchasedSongs.some(s => Number(s.id) === songId);
        
        if (isPurchased || found.can_play === true) {
          setAlreadyPurchased(true);
          setMsg("You already own this track! You can play it now.");
          return;
        }
      }
      
      setSong(found);
    } catch (error) {
      setMsg("Error loading song details.");
    } finally {
      setBusy(false);
    }
  }, [songId, user]);

  useEffect(() => {
    if (songId > 0) {
      loadSong();
    } else {
      navigate("/browse");
    }
  }, [songId, loadSong, navigate]);

  // Check for payment success
  useEffect(() => {
    const status = query.get("status");
    const tx_ref = query.get("tx_ref");
    
    if (status === "success" && tx_ref) {
      // Verify payment
      const verifyPayment = async () => {
        setBusy(true);
        try {
          const response = await fetch(`/api/payment/verify-song?tx_ref=${tx_ref}`);
          const result = await response.json();
          
          if (result.success) {
            toast.success("Payment successful! Track unlocked.");
            await refreshUser();
            // Reload song with updated access
            const songs = await songService.getSongs();
            const updatedSong = songs.find(s => Number(s.id) === songId);
            if (updatedSong && updatedSong.can_play !== false) {
              setAlreadyPurchased(true);
              setMsg("Purchase complete! You can now play this track.");
              setSong(updatedSong);
            }
          } else {
            toast.error(result.message || "Payment verification failed");
          }
        } catch (error) {
          toast.error("Failed to verify payment");
        } finally {
          setBusy(false);
        }
      };
      
      verifyPayment();
      // Remove status from URL
      window.history.replaceState({}, "", `/pro-deal?songId=${songId}`);
    }
  }, [query, songId, refreshUser]);

  const payWithChapa = async () => {
    if (!song) return;
    setBusy(true);
    setMsg("");
    
    try {
      const response = await fetch("/api/payment/initiate-song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ song_id: song.id }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.data?.checkout_url) {
        // Redirect to Chapa checkout
        window.location.href = result.data.data.checkout_url;
        return;
      }
      
      setMsg(result.message || "Unable to initialize payment.");
      toast.error(result.message || "Payment failed");
    } catch (error) {
      setMsg("Payment initialization failed");
      toast.error("Payment initialization failed");
    } finally {
      setBusy(false);
    }
  };

  const playNow = () => {
    if (song) {
      playSong({ ...song, can_play: true });
      navigate("/player");
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">Login Required</h1>
        <p className="mt-2 text-sm text-white/70 mb-6">
          Please sign in to purchase and listen to premium tracks.
        </p>
        <Link
          to={`/login?redirect=/pro-deal?songId=${songId}`}
          className="inline-flex rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white hover:scale-105 transition"
        >
          Sign In to Continue
        </Link>
      </div>
    );
  }

  if (alreadyPurchased && song) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">You Already Own This Track!</h1>
        <p className="text-white/60 mb-6">
          {song.title} - {song.artist}
        </p>
        <button
          onClick={playNow}
          className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:scale-105 transition"
        >
          🎵 Play Now
        </button>
        <div className="mt-4">
          <Link to="/browse" className="text-white/50 text-sm hover:text-white transition">
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-black/20 backdrop-blur-xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">💎</div>
          <h1 className="text-2xl font-bold text-white">Premium Track</h1>
          <p className="text-white/50 text-sm">One-time purchase • Lifetime access</p>
        </div>

        {busy && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-3 border-white/20 border-t-red-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {msg && (
          <div className={`p-4 rounded-xl mb-4 text-center ${
            msg.includes("already own") 
              ? "bg-green-500/20 text-green-200 border border-green-500/30"
              : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
          }`}>
            {msg}
          </div>
        )}

        {song && !alreadyPurchased && (
          <>
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <img
                src={song.cover_image && song.cover_image !== "null" ? song.cover_image : "/assets/images/default-cover.svg"}
                alt={song.title}
                className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover mx-auto md:mx-0"
                onError={(e) => {
                  e.target.src = "/assets/images/default-cover.svg";
                }}
              />
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{song.title}</h2>
                <p className="text-white/60 text-lg mb-2">{song.artist}</p>
                {song.album && <p className="text-white/40 text-sm">{song.album}</p>}
                <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                    ⭐ Premium
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-xs">
                    🎵 One-time purchase
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-amber-400">
                  ${Number(song.price || 0.99).toFixed(2)}
                </p>
                <p className="text-xs text-white/40 mt-1">One-time payment • Lifetime access</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={payWithChapa}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:scale-105 transition-all duration-300"
                >
                  {busy ? "Processing..." : "💳 Pay with Chapa"}
                </button>
                
                <Link
                  to="/subscription"
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm text-center text-white/85 hover:bg-white/10 transition"
                >
                  ⭐ Or upgrade to Premium Subscription (unlock all)
                </Link>
                
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-white/10 px-6 py-2 text-sm text-white/50 hover:text-white/70 transition"
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </>
        )}

        {!song && !busy && !alreadyPurchased && (
          <div className="text-center py-8">
            <p className="text-white/50">Loading track information...</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3">What you get:</h3>
        <ul className="space-y-2 text-sm text-white/60">
          <li className="flex items-center gap-2">✓ <span>Lifetime access to this track</span></li>
          <li className="flex items-center gap-2">✓ <span>High quality audio streaming</span></li>
          <li className="flex items-center gap-2">✓ <span>Download and listen offline</span></li>
          <li className="flex items-center gap-2">✓ <span>Support the artist directly</span></li>
        </ul>
      </div>
    </div>
  );
}

export default ProDeal;