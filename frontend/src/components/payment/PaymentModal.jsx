import { useState } from "react";
import { songService } from "../../services/songService";

function PaymentModal({ song, isOpen, onClose, onSuccess }) {
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !song) return null;

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");
    if (!cardNumber.trim() || cardNumber.replace(/\s/g, "").length < 12) {
      setError("Enter a mock card number (12+ digits).");
      return;
    }
    setBusy(true);
    try {
      const res = await songService.purchaseSong(song.id);
      if (res.success) {
        onSuccess?.();
        onClose();
        setCardName("");
        setCardNumber("");
        setExpiry("");
        setCvv("");
      } else {
        setError(res.message || "Payment failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">Unlock premium track</h3>
        <p className="text-sm text-white/60 mb-4">
          {song.title} — {song.artist}
        </p>
        <p className="text-xs text-amber-200/90 mb-4">
          Mock checkout — no real charges. Any 12+ digit &quot;card&quot; completes
          purchase.
        </p>
        <form onSubmit={handlePay} className="space-y-3">
          <input
            className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder="Name on card"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder="Card number"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
            <input
              className="w-24 rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="CVV"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs text-red-300">{error}</p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/20 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Processing…" : `Pay $${Number(song.price || 0.99).toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PaymentModal;
