import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

function Subscription() {
  const { user, refreshUser } = useAuth();
  const [plan, setPlan] = useState("monthly");
  const [busy, setBusy] = useState(false);

  const upgradeWithChapa = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please log in first.");
      return;
    }
    setBusy(true);
    
    try {
      const response = await fetch("/api/payment/initiate-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.data?.checkout_url) {
        // Redirect to Chapa checkout
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

  // Check URL for payment status
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");
  
  if (status === "success") {
    toast.success("Payment successful! Your subscription is active.");
    refreshUser();
    // Remove status from URL
    window.history.replaceState({}, "", "/subscription");
  }

  return (
    <div className="max-w-lg mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
      <h1 className="text-2xl font-bold text-white mb-2">ZemaLink Premium</h1>
      <p className="text-sm text-white/60 mb-6">
        Get unlimited access to all premium tracks
      </p>
      
      {user?.subscription_status === "premium" && (
        <p className="mb-4 text-emerald-300 text-sm">
          ✅ You are Premium
          {user.subscription_expires
            ? ` · until ${user.subscription_expires}`
            : ""}
        </p>
      )}
      
      <form onSubmit={upgradeWithChapa} className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-300 bg-white/5 border-white/20 hover:bg-white/10">
            <input
              type="radio"
              name="plan"
              value="monthly"
              checked={plan === "monthly"}
              onChange={() => setPlan("monthly")}
              className="w-4 h-4 text-red-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-white">Monthly Plan</div>
              <div className="text-xs text-white/50">Billed monthly</div>
            </div>
            <div className="text-xl font-bold text-white">$9.99</div>
          </label>
          
          <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-300 bg-white/5 border-white/20 hover:bg-white/10">
            <input
              type="radio"
              name="plan"
              value="yearly"
              checked={plan === "yearly"}
              onChange={() => setPlan("yearly")}
              className="w-4 h-4 text-red-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-white">Yearly Plan</div>
              <div className="text-xs text-white/50">Save 17%</div>
            </div>
            <div className="text-xl font-bold text-white">$99.00</div>
          </label>
        </div>
        
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-semibold text-white disabled:opacity-50 hover:scale-105 transition-all duration-300"
        >
          {busy ? "Redirecting to Chapa..." : "Pay with Chapa"}
        </button>
      </form>
      
      <div className="mt-6 p-4 rounded-xl bg-white/5">
        <h3 className="text-sm font-semibold text-white mb-2">Premium Features:</h3>
        <ul className="text-xs text-white/50 space-y-1">
          <li>✓ Unlimited access to all premium songs</li>
          <li>✓ High quality audio streaming</li>
          <li>✓ Download purchased tracks</li>
          <li>✓ No ads</li>
          <li>✓ Support artists directly</li>
        </ul>
      </div>
    </div>
  );
}

export default Subscription;