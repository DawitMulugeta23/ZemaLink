import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await authService.adminExists();
      if (!cancelled && s?.success) {
        setAdminExists(!!s.admin_exists);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const demoAccounts = [
    {
      email: "admin@zemalink.com",
      password: "password",
      role: "Admin",
      icon: "👑",
    },
    {
      email: "musician@zemalink.com",
      password: "password",
      role: "Musician",
      icon: "🎤",
    },
    {
      email: "audience@zemalink.com",
      password: "password",
      role: "Audience",
      icon: "🎧",
    },
    {
      email: "demo@zemalink.com",
      password: "password",
      role: "Demo",
      icon: "🎵",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      if (result.requiresVerification) {
        navigate(
          `/verify-email?email=${encodeURIComponent(result.verificationEmail || email)}`,
        );
        return;
      }
      setError(result.message || "Login failed");
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🎵</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-white/60 text-sm mt-2">
            Sign in to continue to ZemaLink
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {!adminExists && (
          <div className="mb-4 p-4 rounded-xl border border-amber-400/40 bg-amber-500/15 text-center">
            <p className="text-sm text-amber-100/95 mb-3">
              No administrator account exists yet. Register the first admin to continue setup.
            </p>
            <Link
              to="/register?role=admin"
              className="inline-flex justify-center items-center px-5 py-2.5 rounded-full font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:opacity-95 transition-opacity"
            >
              Register administrator
            </Link>
          </div>
        )}

        {/* Demo Accounts Quick Select */}
        <div className="mb-6">
          <p className="text-xs text-white/50 text-center mb-2">
            Quick login (seed data — password is{" "}
            <span className="text-white/70 font-mono">password</span>):
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {demoAccounts.map((account, idx) => (
              <button
                key={idx}
                onClick={() => fillCredentials(account.email, account.password)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs transition flex items-center gap-1"
              >
                <span>{account.icon}</span>
                <span>{account.role}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-6"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-red-400 hover:text-red-300 font-semibold transition"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
