import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link");
      navigate("/login");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const res = await authService.resetPassword(token, password);
      if (res.success) {
        setDone(true);
        toast.success("Password reset successfully! You can now log in.");
      } else {
        toast.error(res.message || "Failed to reset password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="rounded-3xl glass-dark p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset</h1>
          <p className="text-slate-400 mb-6">Your password has been updated.</p>
          <Link to="/login" className="btn-primary inline-flex !py-3 px-6">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-3xl glass-dark p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Set New Password</h1>
        <p className="text-slate-400 text-sm text-center mb-6">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="input-field" required minLength={6} autoComplete="new-password" />
          </div>
          <div>
            <label className="input-label">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" className="input-field" required autoComplete="new-password" />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
