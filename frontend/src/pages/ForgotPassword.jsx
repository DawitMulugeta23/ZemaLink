import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email"); return; }
    setBusy(true);
    try {
      const res = await authService.forgotPassword(email);
      if (res.success) {
        setSent(true);
        toast.success(res.message || "If that email exists, a reset link has been sent.");
      } else {
        toast.error(res.message || "Failed to send reset link");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-3xl glass-dark p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Forgot Password</h1>
        <p className="text-slate-400 text-sm text-center mb-6">
          Enter your email and we'll send you a reset link.
        </p>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
              {busy ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-4">📧</div>
            <p className="text-slate-300 mb-2">Check your email inbox.</p>
            <p className="text-xs text-slate-500">The reset link expires in 1 hour.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-primary-400 hover:underline">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
