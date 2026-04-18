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
  const [payBusy, setPayBusy] = useState(false);

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const songId = useMemo(() => {
    const raw = query.get("songId");
    return raw ? Number(raw) : 0;
  }, [query]);
  const txRef = useMemo(() => query.get("tx_ref") || "", [query]);

  const loadSong = useCallback(async () => {
    setBusy(true);
    setMsg("");
    const songs = await songService.getSongs();
    const found = songs.find((s) => Number(s.id) === songId);
    setBusy(false);
    if (!found) {
      setMsg("This premium track was not found.");
      return;
    }
    setSong(found);
  }, [songId]);

  useEffect(() => {
    if (!song && songId > 0) {
      loadSong();
    }
  }, [song, songId, loadSong]);

  useEffect(() => {
    const verifyReturnedPayment = async () => {
      if (!songId || !txRef) return;
      setPayBusy(true);
      let verified = null;
      // Chapa can be eventually consistent right after redirect; retry briefly.
      for (let i = 0; i < 4; i += 1) {
        const res = await songService.verifySongPayment(songId, txRef);
        if (res.success) {
          verified = res;
          break;
        }
        if (i < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          setMsg(res.message || "Payment verification is not completed yet.");
        }
      }
      setPayBusy(false);

      if (verified) {
        await refreshUser();
        const songs = await songService.getSongs();
        const resolvedSongId = Number(verified.song_id || songId);
        const unlocked =
          songs.find((s) => Number(s.id) === resolvedSongId) ||
          (song && Number(song.id) === resolvedSongId ? song : null);
        if (unlocked) {
          const playable = { ...unlocked, can_play: true };
          setSong(playable);
          setMsg("Payment confirmed. Track unlocked and playing now.");
          toast.success("Payment successful. Playing your PRO song.");
          playSong(playable);
        } else {
          toast.success("Payment successful. Song unlocked.");
        }
      }
    };
    verifyReturnedPayment();
  }, [songId, txRef, refreshUser, playSong, song]);

  const payWithChapa = async () => {
    if (!song) return;
    setPayBusy(true);
    setMsg("");
    const returnUrl = `${window.location.origin}/pro-deal?songId=${song.id}`;
    const res = await songService.initiateSongPayment(song.id, returnUrl);
    setPayBusy(false);
    const checkoutUrl = res?.chapa?.data?.checkout_url || res?.chapa?.checkout_url;
    if (res.success && checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }
    const errorMsg = res.message || "Unable to initialize Chapa checkout.";
    setMsg(errorMsg);
    toast.error(errorMsg);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <h1 className="text-2xl font-bold text-white">Pro deal</h1>
        <p className="mt-2 text-sm text-white/70">
          Please sign in first to unlock premium tracks.
        </p>
        <Link
          to="/login"
          className="inline-flex mt-5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <h1 className="text-2xl font-bold text-white">Premium access</h1>
        <p className="mt-2 text-sm text-white/70">
          This is a PRO track. Buy this song once or upgrade your subscription to
          access all premium songs.
        </p>

        {busy && <p className="mt-4 text-white/50 text-sm">Loading track...</p>}
        {msg && <p className="mt-4 text-amber-200 text-sm">{msg}</p>}

        {song && (
          <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
            <p className="text-white font-semibold">{song.title}</p>
            <p className="text-sm text-white/60">{song.artist}</p>
            <p className="mt-2 text-sm text-amber-200">
              Price: ${Number(song.price || 0.99).toFixed(2)}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!song || payBusy}
            onClick={payWithChapa}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {payBusy ? "Connecting Chapa..." : "Pay with Chapa (Test)"}
          </button>
          <Link
            to="/subscription"
            className="rounded-xl border border-white/20 px-5 py-2 text-sm text-white/85 hover:bg-white/10"
          >
            Upgrade subscription
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-white/20 px-5 py-2 text-sm text-white/60 hover:bg-white/10"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProDeal;
