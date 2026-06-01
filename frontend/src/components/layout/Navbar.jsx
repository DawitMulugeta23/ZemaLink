import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onMenuToggle }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: '🏠', show: true },
    { path: '/browse', label: 'Browse', icon: '🎵', show: isAuthenticated },
    { path: '/search', label: 'Search', icon: '🔍', show: true },
    { path: '/library', label: 'Library', icon: '📚', show: isAuthenticated },
    { path: '/playlists', label: 'Playlists', icon: '📋', show: isAuthenticated },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 backdrop-blur-xl ${
      isDark
        ? 'bg-slate-900/80 border-white/10'
        : 'bg-white/80 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <span className="text-2xl transition-transform duration-300 group-hover:rotate-12">🎵</span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 bg-clip-text text-transparent tracking-wide">
                ZemaLink
              </span>
            </Link>
          </div>

          <form onSubmit={handleSearch} className={`hidden md:flex items-center transition-all duration-300 ${
            searchFocused ? 'flex-1 max-w-md mx-4' : 'w-56 mx-4'
          }`}>
            <div className="relative w-full">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search songs, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full pl-10 pr-4 py-2 rounded-full text-sm border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  isDark
                    ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </form>

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
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className={`lg:hidden border-t ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="px-4 py-4 space-y-2">
            <form onSubmit={handleSearch} className="md:hidden mb-3">
              <div className="relative">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    isDark ? 'bg-slate-800 border-white/10 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </form>
            {navLinks.map((link) => link.show && (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                    : `${isDark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
