import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentService } from "../services/paymentService";
import { toast } from "react-toastify";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    gradient: "from-slate-500 to-slate-600",
    features: [
      "Standard audio quality",
      "Basic search",
      "Create up to 3 playlists",
      "Ads supported",
    ],
    highlighted: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$5.99",
    period: "/month",
    save: null,
    gradient: "from-purple-500 to-cyan-500",
    features: [
      "High quality audio (320kbps)",
      "Unlimited skips",
      "Unlimited playlists",
      "Ad-free experience",
      "Download for offline listening",
      "Premium content access",
    ],
    highlighted: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$49.99",
    period: "/year",
    save: "Save 30%",
    gradient: "from-amber-500 to-orange-500",
    features: [
      "Everything in Monthly",
      "Best value pricing",
      "Priority support",
      "Early access to new features",
      "Exclusive artist content",
    ],
    highlighted: false,
  },
];

function Subscription() {
  const { user, isPremium, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentPlan = isPremium ? (user?.subscription_plan || "monthly") : "free";

  const upgradeWithChapa = async () => {
    if (!user) { toast.info("Please log in first."); return; }
    setBusy(true);
    try {
      const result = await paymentService.initiateSubscription(selectedPlan);
      if (result.success && result.data?.data?.checkout_url) {
        window.location.href = result.data.data.checkout_url;
      } else {
        toast.error(result.message || "Failed to initialize payment");
      }
    } catch (error) {
      toast.error("Payment initialization failed");
    } finally {
      setBusy(false);
    }
  };

  const upgradeWithMock = async () => {
    if (!user) { toast.info("Please log in first."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/user/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: selectedPlan })
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Subscription activated successfully!");
        await refreshUser();
        setShowConfirm(true);
      } else {
        toast.error(result.message || "Subscription failed");
      }
    } catch (error) {
      toast.error("Subscription failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get("status");
    const tx_ref = urlParams.get("tx_ref");
    if (status === "success" && tx_ref) {
      const verify = async () => {
        try {
          const response = await fetch(`/api/payment/verify-subscription?tx_ref=${tx_ref}`);
          const result = await response.json();
          if (result.success) {
            toast.success("Payment successful! Your subscription is active.");
            await refreshUser();
            setShowConfirm(true);
            window.history.replaceState({}, "", "/subscription");
          }
        } catch (error) {
          console.error("Verification error:", error);
        }
      };
      verify();
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
          Unlock the full ZemaLink experience. Upgrade for high-quality audio, unlimited skips, offline listening, and more.
        </p>
        {isPremium && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold">
            ✓ You are on the <strong className="capitalize">{currentPlan}</strong> plan
            {user?.subscription_expires && (
              <span className="text-xs text-slate-400">· until {new Date(user.subscription_expires).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isSelected = selectedPlan === plan.id;
          const isDisabled = isCurrent && isPremium;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-6 transition-all duration-300 ${
                isCurrent && isPremium
                  ? "border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                  : isSelected
                  ? "border-purple-500/40 bg-[#1a1a2e] shadow-lg shadow-purple-500/10"
                  : "border-white/[0.08] bg-[#13131f] hover:border-white/20"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  Most Popular
                </div>
              )}
              {isCurrent && isPremium && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  Current Plan
                </div>
              )}

              {plan.save && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  {plan.save}
                </div>
              )}

              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white text-xl mb-4 shadow-lg`}>
                {plan.id === "free" ? "🎵" : plan.id === "monthly" ? "⭐" : "👑"}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <div className="text-center text-sm text-slate-500 py-3">Currently active</div>
              ) : isDisabled ? (
                <div className="text-center text-sm text-slate-500 py-3">Current plan</div>
              ) : (
                <button
                  onClick={() => { setSelectedPlan(plan.id); setShowConfirm(true); }}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-300 ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20"
                      : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {isPremium ? "Switch Plan" : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 max-w-3xl mx-auto">
        <h3 className="text-lg font-bold text-white mb-4 text-center">Feature Comparison</h3>
        <div className="rounded-3xl border border-white/[0.08] bg-[#13131f] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left p-4 text-slate-400 font-medium">Feature</th>
                <th className="p-4 text-center text-slate-400 font-medium">Free</th>
                <th className="p-4 text-center text-purple-300 font-medium">Monthly</th>
                <th className="p-4 text-center text-amber-300 font-medium">Yearly</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Audio Quality", free: "Standard", monthly: "High (320kbps)", yearly: "High (320kbps)" },
                { label: "Skips", free: "6/hour", monthly: "Unlimited", yearly: "Unlimited" },
                { label: "Playlists", free: "Up to 3", monthly: "Unlimited", yearly: "Unlimited" },
                { label: "Ads", free: "Supported", monthly: "Ad-free", yearly: "Ad-free" },
                { label: "Offline Listening", free: "—", monthly: "✓", yearly: "✓" },
                { label: "Premium Content", free: "—", monthly: "✓", yearly: "✓" },
                { label: "Priority Support", free: "—", monthly: "—", yearly: "✓" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="p-4 text-white font-medium">{row.label}</td>
                  <td className="p-4 text-center text-slate-400">{row.free}</td>
                  <td className="p-4 text-center text-purple-300">{row.monthly}</td>
                  <td className="p-4 text-center text-amber-300">{row.yearly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#13131f] p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">{selectedPlan === "monthly" ? "⭐" : "👑"}</div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isPremium ? "Switch Plan" : "Upgrade to Premium"}
              </h2>
              <p className="text-slate-400 text-sm">
                {selectedPlan === "monthly" ? "$5.99/month" : "$49.99/year"} — {selectedPlan === "yearly" && "Save 30%"}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={upgradeWithChapa}
                disabled={busy}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-bold text-white disabled:opacity-50 hover:scale-[1.01] transition"
              >
                {busy ? "Processing..." : "💳 Pay with Chapa"}
              </button>
              <button
                onClick={upgradeWithMock}
                disabled={busy}
                className="w-full rounded-xl border border-white/10 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/5 transition disabled:opacity-50"
              >
                🔧 Mock Payment (Test Mode)
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full rounded-xl py-3 text-sm text-slate-500 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscription;
