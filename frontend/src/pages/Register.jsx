import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";

function Register() {
  const [searchParams] = useSearchParams();
  const adminMode = searchParams.get("role") === "admin";
  const [adminExists, setAdminExists] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: adminMode ? "admin" : "audience",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await authService.adminExists();
      if (cancelled || !s?.success) return;
      setAdminExists(!!s.admin_exists);
      if (s.admin_exists && adminMode) {
        navigate("/register", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminMode, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleSelect = (role) => {
    setFormData({
      ...formData,
      role: role,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!formData.name.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      adminMode ? "admin" : formData.role,
    );

    setLoading(false);

    if (result.success) {
      setSuccess(result.message || "Registration successful!");
      const em = (result.verificationEmail || formData.email).toLowerCase();
      if (result.requiresVerification && result.verificationCode) {
        sessionStorage.setItem(`zema_otp_${em}`, result.verificationCode);
      }
      setTimeout(() => {
        if (result.requiresVerification) {
          const hint = encodeURIComponent(result.message || "");
          navigate(
            `/verify-email?email=${encodeURIComponent(result.verificationEmail || formData.email)}&hint=${hint}`,
          );
        } else {
          navigate("/");
        }
      }, 1200);
    } else {
      setError(result.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🎵</span>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-white/60 text-sm mt-2">
            {adminMode
              ? "Create the first administrator account"
              : "Join ZemaLink Music Platform"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-200 text-sm text-center">
            {success}
          </div>
        )}

        {!adminExists && !adminMode && (
          <div className="mb-4 p-4 rounded-xl border border-amber-400/40 bg-amber-500/15 text-center">
            <p className="text-sm text-amber-100/95 mb-3">
              No administrator is registered yet. Create the first admin account to manage the
              platform.
            </p>
            <Link
              to="/register?role=admin"
              className="inline-flex justify-center items-center px-5 py-2.5 rounded-full font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:opacity-95 transition-opacity"
            >
              Register administrator
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition pr-12"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition"
              >
                {showPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition pr-12"
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition"
              >
                {showConfirmPassword ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="block text-white/70 text-sm">
              I want to join as:
            </label>
            {adminMode ? (
              <div className="p-4 rounded-xl border border-orange-400/40 bg-orange-500/15">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <span className="font-semibold text-sm text-white">
                    Administrator account
                  </span>
                </div>
                <p className="text-xs text-orange-100/90 mt-2">
                  Admin mode is enabled from the setup link. This account will be
                  created with full admin privileges.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("audience")}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === "audience"
                      ? "bg-gradient-to-r from-red-500 to-pink-500 border-transparent shadow-lg scale-105"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="text-3xl mb-2">🎧</div>
                  <div className="font-semibold text-sm">Listener</div>
                  <div className="text-xs text-white/50 mt-1">
                    Listen to music
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("musician")}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.role === "musician"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 border-transparent shadow-lg scale-105"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="text-3xl mb-2">🎤</div>
                  <div className="font-semibold text-sm">Musician</div>
                  <div className="text-xs text-white/50 mt-1">
                    Upload your music
                  </div>
                </button>
              </div>
            )}
          </div>
          {!adminMode && formData.role === "musician" && (
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/50">
              <p className="text-xs text-blue-200 text-center">
                Musician accounts require admin approval. You'll be notified
                once approved.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg mt-4"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-red-400 hover:text-red-300 font-semibold transition"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
