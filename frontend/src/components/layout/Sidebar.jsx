import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/browse', icon: '🎵', label: 'Browse' },
  { path: '/search', icon: '🔍', label: 'Search' },
  { path: '/library', icon: '📚', label: 'Library', auth: true },
  { path: '/playlists', icon: '📋', label: 'Playlists', auth: true },
  { path: '/events', icon: '🎫', label: 'Events' },
  { path: '/live-streams', icon: '📺', label: 'Live Streams' },
  { path: '/musician-dashboard', icon: '🎤', label: 'Studio', role: 'musician' },
  { path: '/admin-dashboard', icon: '👑', label: 'Admin', role: 'admin' },
];

export default function Sidebar({ isCollapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const visibleItems = navItems.filter((item) => {
    if (item.role) return user?.role === item.role;
    if (item.auth) return isAuthenticated;
    return true;
  });

  const sidebarContent = (
    <div className={`flex flex-col h-full ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        {!isCollapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onMobileClose}
            className={`group relative flex items-center rounded-xl transition-all duration-200 ${
              isCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'
            } ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                : `${isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'}`
            }`}
          >
            <span className={`text-xl transition-transform duration-200 ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
            {isActive(item.path) && !isCollapsed && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
            )}
            {isCollapsed && isActive(item.path) && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-purple-500 to-pink-500" />
            )}
          </Link>
        ))}
      </nav>

      {user && (
        <div className={`p-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <Link
            to="/profile"
            onClick={onMobileClose}
            className={`flex items-center rounded-xl transition-colors ${
              isCollapsed ? 'justify-center p-2' : 'p-2 gap-3'
            } ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-purple-500/20">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 capitalize">
                  {user.role}
                </span>
              </div>
            )}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] hidden lg:flex flex-col transition-all duration-300 z-30 border-r ${
          isDark ? 'bg-slate-900/80 border-white/10 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl'
        } ${isCollapsed ? 'w-16' : 'w-60'}`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-60 border-r animate-slide-up ${
            isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
