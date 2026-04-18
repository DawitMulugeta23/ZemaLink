import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function AuthModal({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      if (!name.trim()) {
        setError("Name is required");
        setLoading(false);
        return;
      }
      result = await register(name, email, password);
    }

    if (result.success) {
      onClose();
    } else {
      setError(result.message || "Authentication failed");
    }
    setLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition text-xl z-10"
          >
            ✕
          </button>

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🎵</span>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-yellow-400 to-pink-400 bg-clip-text text-transparent">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {isLogin
                  ? "Sign in to continue to ZemaLink"
                  : "Join ZemaLink and start listening"}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                  required
                />
              )}

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                required
              />

              {!isLogin && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition"
                  required
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            {/* Switch between Login/Register */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setName("");
                  setConfirmPassword("");
                }}
                className="text-white/60 hover:text-white text-sm transition"
              >
                {isLogin
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </div>

            {/* Demo Credentials Hint */}
            {isLogin && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/40 text-xs text-center">
                  Demo: demo@example.com / password
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default AuthModal;
