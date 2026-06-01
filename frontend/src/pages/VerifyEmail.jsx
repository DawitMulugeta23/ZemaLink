import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function extractSixDigit(text) {
  if (!text) return '';
  const m =
    text.match(/(?:OTP code:|verification code:?|code:?)\s*(\d{6})/i) ||
    text.match(/\b(\d{6})\b/);
  return m ? m[1] : '';
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyCode, resendCode, pendingVerificationEmail } = useAuth();

  const [otp, setOtp] = useState(Array(6).fill(''));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  const email = (
    searchParams.get('email') || pendingVerificationEmail || ''
  ).toLowerCase().trim();

  // Auto-fill OTP from hint/sessionStorage
  useEffect(() => {
    const hintRaw = searchParams.get('hint') || '';
    let decodedHint = '';
    try { decodedHint = decodeURIComponent(hintRaw); } catch { decodedHint = hintRaw; }
    const fromQuery = searchParams.get('code') || extractSixDigit(decodedHint);
    const stored = email ? sessionStorage.getItem(`zema_otp_${email}`) : '';
    const resolved = fromQuery || stored;
    if (resolved && resolved.length === 6) {
      const digits = resolved.split('');
      setOtp(digits);
    }
  }, [email, searchParams]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '');
    if (!digit && otp[index] !== '') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }
    if (!digit) return;

    const newOtp = [...otp];
    newOtp[index] = digit.slice(-1);
    setOtp(newOtp);

    // Auto-focus next
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = Array(6).fill('');
      pasted.split('').forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const code = otp.join('');
    if (!email) {
      setError('Email is missing. Please register again.');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setBusy(true);
    const result = await verifyCode(email, code);
    setBusy(false);

    if (result.success) {
      sessionStorage.removeItem(`zema_otp_${email}`);
      setMessage(result.message || 'Email verified successfully!');
      setTimeout(() => navigate('/login'), 900);
    } else {
      setError(result.message || 'Invalid verification code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError('');
    setMessage('');
    if (!email) {
      setError('Email is missing. Please register again.');
      return;
    }

    setResending(true);
    const result = await resendCode(email);
    setResending(false);

    if (result.success) {
      const text = result.message || 'A new code has been sent.';
      setMessage(text);
      setCooldown(60);
      const newCode = result.verification_code || extractSixDigit(text);
      if (newCode && newCode.length === 6) {
        sessionStorage.setItem(`zema_otp_${email}`, newCode);
        setOtp(newCode.split(''));
      }
    } else {
      setError(result.message || 'Could not resend code');
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <div className="glass-dark rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Mail Icon */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-4xl">✉️</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-slate-400 text-sm mt-2">
              Enter the 6-digit code sent to
            </p>
            <p className="text-white font-medium text-sm truncate">{email || 'your email'}</p>
          </div>

          {/* OTP Display (from session) */}
          {otp.every((d) => d !== '') && (
            <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center">
              <p className="text-xs text-green-300 mb-1">Code from registration</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-green-100 font-mono">
                {otp.join('')}
              </p>
            </div>
          )}

          {/* Error / Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-5 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm text-center">
              {message}
            </div>
          )}

          {/* OTP Input Form */}
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition"
                  aria-label={`Digit ${index + 1}`}
                  required
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={busy || !isComplete}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Code'
              )}
            </button>
          </form>

          {/* Resend & Back */}
          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-slate-400 hover:text-primary-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend code'}
            </button>
            <Link to="/login" className="text-slate-500 hover:text-white transition">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
