import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function Register() {
  const [searchParams] = useSearchParams();
  const adminMode = searchParams.get('role') === 'admin';
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: adminMode ? 'admin' : 'audience',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [adminExists, setAdminExists] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authService.adminExists();
      if (cancelled || !res?.success) return;
      if (!cancelled) setAdminExists(res.admin_exists);
      if (res.admin_exists && adminMode) {
        navigate('/register', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [adminMode, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'name' ? value.replace(/[^A-Za-z\s]/g, '') : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setError('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    else if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) errors.name = 'Name must contain only letters and spaces';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    const result = await register(formData.name, formData.email, formData.password, adminMode ? 'admin' : formData.role);
    setLoading(false);

    if (result.success) {
      setSuccess(result.message || 'Registration successful!');
      const em = (result.verificationEmail || formData.email).toLowerCase();
      if (result.requiresVerification && result.verificationCode) {
        sessionStorage.setItem(`zema_otp_${em}`, result.verificationCode);
      }
      setTimeout(() => {
        if (result.requiresVerification) {
          const emailParam = encodeURIComponent(result.verificationEmail || formData.email);
          const codeParam = encodeURIComponent(result.verificationCode || '');
          navigate(`/verify-email?email=${emailParam}&code=${codeParam}`);
        } else {
          navigate('/');
        }
      }, 1200);
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  const inputClass = (field) =>
    `input-field pr-12 ${
      validationErrors[field] ? 'input-field-error' : ''
    }`;

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-3xl font-bold gradient-text">
              Create Account
            </h2>
            <p className="text-surface-500 dark:text-surface-400 text-sm mt-2">
              {adminMode ? 'Set up the first administrator account' : 'Join ZemaLink Music Platform'}
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
              {success}
            </div>
          )}

          {/* Admin warning */}
          {adminExists === false && !adminMode && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center">
              <p className="text-sm text-amber-200 mb-3">No admin registered yet.</p>
              <Link to="/register?role=admin" className="inline-flex px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm transition hover:scale-105">
                Register as Admin
              </Link>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className={inputClass('name')}
                required
              />
              {validationErrors.name && <p className="mt-1 text-xs text-red-400">{validationErrors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={inputClass('email')}
                required
                autoComplete="email"
              />
              {validationErrors.email && <p className="mt-1 text-xs text-red-400">{validationErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className={inputClass('password')}
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition" tabIndex={-1}>
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && <p className="mt-1 text-xs text-red-400">{validationErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={inputClass('confirmPassword')}
                  required
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition" tabIndex={-1}>
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && <p className="mt-1 text-xs text-red-400">{validationErrors.confirmPassword}</p>}
            </div>

            {/* Role Selector */}
            {adminMode ? (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <span className="font-semibold text-sm text-white">Administrator</span>
                </div>
                <p className="text-xs text-amber-200/80 mt-2">This account will have full admin privileges.</p>
              </div>
            ) : (
              <div>
                <label className="input-label">I want to join as:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'audience' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      formData.role === 'audience'
                        ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10 scale-105'
                        : 'border-surface-300 dark:border-surface-600 bg-surface-100/50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎧</div>
                    <div className="font-semibold text-sm text-surface-900 dark:text-white">Listener</div>
                    <div className="text-xs text-surface-500 mt-1">Listen to music</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'musician' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      formData.role === 'musician'
                        ? 'border-accent-500 bg-accent-500/10 shadow-lg shadow-accent-500/10 scale-105'
                        : 'border-surface-300 dark:border-surface-600 bg-surface-100/50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎤</div>
                    <div className="font-semibold text-sm text-surface-900 dark:text-white">Musician</div>
                    <div className="text-xs text-surface-500 mt-1">Upload your music</div>
                  </button>
                </div>
              </div>
            )}

            {!adminMode && formData.role === 'musician' && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-400 text-center">Musician accounts require admin approval. You&apos;ll be notified once approved.</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-surface-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}