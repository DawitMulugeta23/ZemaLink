import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const DEMO_ACCOUNTS = [
  { email: 'admin@zemalink.com', password: 'password', role: 'Admin', icon: '👑' },
  { email: 'musician@zemalink.com', password: 'password', role: 'Musician', icon: '🎤' },
  { email: 'audience@zemalink.com', password: 'password', role: 'Audience', icon: '🎧' },
  { email: 'demo@zemalink.com', password: 'password', role: 'Demo', icon: '🎵' },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authService.adminExists();
      if (!cancelled && res?.success) setAdminExists(!!res.admin_exists);
    })();
    return () => { cancelled = true; };
  }, []);

  const validate = () => {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    if (!password) return 'Password is required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate(redirectUrl);
    } else {
      if (result.requiresVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(result.verificationEmail || email)}&redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }
      setError(result.message || 'Invalid email or password');
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <div className="glass-dark rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-slate-400 text-sm mt-2">Sign in to continue to ZemaLink</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Admin warning */}
          {!adminExists && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <p className="text-sm text-amber-200 mb-3">No admin account exists yet.</p>
              <Link to="/register?role=admin" className="inline-flex px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm transition hover:scale-105">
                Register as Admin
              </Link>
            </div>
          )}

          {/* Demo Accounts */}
          <div className="mb-6">
            <p className="text-xs text-slate-500 text-center mb-2">
              Quick login (password: <span className="text-slate-300 font-mono">password</span>):
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {DEMO_ACCOUNTS.map((acc, i) => (
                <button
                  key={i}
                  onClick={() => fillCredentials(acc.email, acc.password)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition flex items-center gap-1"
                >
                  <span>{acc.icon}</span>
                  <span>{acc.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-lg"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button type="button" className="text-xs text-slate-500 hover:text-primary-400 transition">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold transition">
                Create Account
              </Link>
            </p>
          </div>

          {/* Redirect info */}
          {redirectUrl !== '/' && redirectUrl.includes('pro-deal') && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-300 text-center">
                After login, you&apos;ll be redirected to complete your purchase.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
