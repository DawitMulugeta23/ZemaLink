import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { songService } from "../services/songService";

function Subscription() {
  const { user, refreshUser } = useAuth();
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const upgrade = async (e) => {
    e.preventDefault();
    if (!user) {
      setMsg("Please log in first.");
      return;
    }
    setBusy(true);
    setMsg("");
    const r = await songService.upgradeSubscription(plan);
    setBusy(false);
    if (r.success) {
      setMsg(`Upgraded! Active until ${r.subscription_expires || ""}`);
      await refreshUser();
    } else {
      setMsg(r.message || "Failed");
    }
  };

  return (
    <div className="max-w-lg mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
      <h1 className="text-2xl font-bold text-white mb-2">ZemaLink Premium</h1>
      <p className="text-sm text-white/60 mb-6">
        Mock subscription — unlocks all premium tracks while active.
      </p>
      {user?.subscription_status === "premium" && (
        <p className="mb-4 text-emerald-300 text-sm">
          You are Premium
          {user.subscription_expires
            ? ` · until ${user.subscription_expires}`
            : ""}
        </p>
      )}
      <form onSubmit={upgrade} className="space-y-4">
        <label className="block text-sm text-white/80">
          Plan
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-white"
          >
            <option value="monthly">Monthly — $9.99</option>
            <option value="yearly">Yearly — $99.00</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Processing…" : "Pay with mock checkout"}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
    </div>
  );
}

export default Subscription;
