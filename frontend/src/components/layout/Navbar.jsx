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
    { path: '/', label: '', show: false },
    { path: '/browse', label: 'Browse', show: isAuthenticated },
    { path: '/events', label: 'Events', show: isAuthenticated },
    { path: '/live-streams', label: 'Live', show: isAuthenticated },
    { path: '/library', label: 'Library', show: isAuthenticated },
    { path: '/playlists', label: 'Playlists', show: user?.role === 'musician' },
    { path: '/musician-dashboard', label: 'Studio', show: user?.role === 'musician' },
    { path: '/admin-dashboard', label: 'Admin', show: user?.role === 'admin' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 backdrop-blur-xl shadow-sm ${
      isDark ? 'bg-surface-dark/80 border-surface-700/30' : 'bg-white/80 border-surface-200'
    }`}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '90rem' }}>
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-2xl transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12">🎵</span>
              <span className="text-lg font-bold gradient-text tracking-wide">
                ZemaLink
              </span>
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 justify-center items-center gap-1">
            {navLinks.map((link) => link.show && (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/25'
                    : `${isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`
                }`}
              >
                {link.label}
              </Link>
            ))}
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
                    isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary !px-5 !py-2 !rounded-full !text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-lg btn-icon"
              aria-label="Toggle menu"
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-surface-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className={`lg:hidden border-t ${isDark ? 'border-surface-700/30 bg-surface-dark' : 'border-surface-200 bg-white'}`}>
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => link.show && (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-primary-500/15 to-accent-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/20'
                    : `${isDark ? 'text-surface-300 hover:text-white hover:bg-surface-800' : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'}`
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