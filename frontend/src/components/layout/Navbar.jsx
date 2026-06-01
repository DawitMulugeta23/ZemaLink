import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Home', show: true },
    { path: '/browse', label: 'Browse', show: true },
    { path: '/events', label: 'Events', show: true },
    { path: '/live-streams', label: 'Live', show: true },
    { path: '/library', label: 'Library', show: isAuthenticated },
    { path: '/playlists', label: 'Playlists', show: isAuthenticated },
    { path: '/musician-dashboard', label: 'Studio', show: user?.role === 'musician' },
    { path: '/admin-dashboard', label: 'Admin', show: user?.role === 'admin' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 backdrop-blur-xl ${
      isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group shrink-0 mr-3">
              <span className="text-2xl transition-transform duration-300 group-hover:rotate-12">🎵</span>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 bg-clip-text text-transparent tracking-wide">
                ZemaLink
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => link.show && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                      : `${isDark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isDark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 hover:scale-[1.02] transition-all duration-300"
                >
                  Get Started
                </Link>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className={`lg:hidden border-t ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => link.show && (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                    : `${isDark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
