import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function extractSixDigit(text) {
  if (!text) return "";
  const m =
    text.match(/(?:OTP code:|verification code:?|code:?)\s*(\d{6})/i) ||
    text.match(/\b(\d{6})\b/);
  return m ? m[1] : "";
}

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyCode, resendCode, pendingVerificationEmail } = useAuth();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpHint, setOtpHint] = useState(() => searchParams.get("hint") || "");
  const [shownCode, setShownCode] = useState("");

  const email = useMemo(
    () =>
      (searchParams.get("email") || pendingVerificationEmail || "")
        .toLowerCase()
        .trim(),
    [searchParams, pendingVerificationEmail],
  );

  useEffect(() => {
    const hintRaw = searchParams.get("hint") || "";
    let decodedHint = "";
    try {
      decodedHint = decodeURIComponent(hintRaw);
    } catch {
      decodedHint = hintRaw;
    }
    const fromQuery =
      searchParams.get("code") || extractSixDigit(decodedHint);
    const stored = email ? sessionStorage.getItem(`zema_otp_${email}`) : "";
    const resolved = fromQuery || stored;
    if (resolved) {
      setShownCode(resolved);
      setCode((prev) => (prev.length >= 6 ? prev : resolved));
    }
  }, [email, searchParams]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!email) {
      setError("Email is missing. Please register again.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setBusy(true);
    const result = await verifyCode(email, code.trim());
    setBusy(false);
    if (result.success) {
      sessionStorage.removeItem(`zema_otp_${email}`);
      setMsg(result.message || "Email verified. Please sign in.");
      setTimeout(() => navigate("/login"), 900);
    } else {
      setError(result.message || "Verification failed");
    }
  };

  const resend = async () => {
    setError("");
    setMsg("");
    if (!email) {
      setError("Email is missing. Please register again.");
      return;
    }
    setResending(true);
    const result = await resendCode(email);
    setResending(false);
    if (result.success) {
      const text = result.message || "A new code has been sent.";
      setMsg(text);
      const newCode = result.verification_code || extractSixDigit(text);
      if (newCode) {
        sessionStorage.setItem(`zema_otp_${email}`, newCode);
        setShownCode(newCode);
        setCode(newCode);
      }
      if (/OTP code:/i.test(text)) {
        setOtpHint(text);
      }
    }
    else setError(result.message || "Could not resend code");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Verify your email
        </h1>
        <p className="text-sm text-white/65 text-center mb-6">
          Enter the 6-digit code sent to
          <span className="text-white font-medium"> {email || "your email"}</span>
        </p>
        {shownCode && (
          <div className="mb-5 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-5 text-center">
            <p className="text-xs uppercase tracking-wider text-emerald-100/90 mb-2">
              Your verification code
            </p>
            <p
              className="text-3xl sm:text-4xl font-bold tracking-[0.4em] pl-[0.2em] text-emerald-50 font-mono"
              aria-live="polite"
            >
              {shownCode}
            </p>
            <p className="mt-2 text-xs text-emerald-100/75">
              Same code is pre-filled below. Copy it if your email is delayed.
            </p>
          </div>
        )}
        {otpHint && !shownCode && (
          <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-500/15 p-3">
            <p className="text-xs text-amber-100">OTP helper:</p>
            <p className="mt-1 text-sm font-semibold tracking-wide text-amber-50">
              {otpHint}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        )}
        {msg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 text-sm text-center">
            {msg}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-white/75">
            Verification code
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-2 w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white tracking-[0.35em] text-center text-lg"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify code"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-amber-200 hover:text-amber-100 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
          <Link to="/login" className="text-white/70 hover:text-white">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
