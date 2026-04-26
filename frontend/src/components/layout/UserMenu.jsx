import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsOpen(false);
  };

  if (!user) return null;

  const menuItems = [
    { label: "Profile", icon: "👤", path: "/profile", show: true },
    { label: "Search", icon: "🔍", path: "/browse", show: true },
    { label: "Admin Dashboard", icon: "👑", path: "/admin-dashboard", show: user.role === "admin" },
    { label: "Registered Users", icon: "🧾", path: "/admin-registered", show: user.role === "admin" },
    { label: "Musician Studio", icon: "🎤", path: "/musician-dashboard", show: user.role === "musician" },
    { label: "My Library", icon: "📚", path: "/library", show: true },
    { label: "Purchased", icon: "💎", path: "/purchased", show: true },
    { label: "Subscription", icon: "⭐", path: "/subscription", show: true },
    { label: "Settings", icon: "⚙️", path: "/settings", show: true },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
          {user.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">
            {user.name?.split(" ")[0] || user.name}
          </p>
          <p className="text-xs text-white/50 capitalize">{user.role}</p>
        </div>
        <svg
          className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-50">
            {/* User Info Header */}
            <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white/80 capitalize">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2 max-h-96 overflow-y-auto">
              {visibleItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200 group"
                >
                  <span className="text-xl w-7 group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 mx-2"></div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200 group"
            >
              <span className="text-xl w-7 group-hover:scale-110 transition-transform">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default UserMenu;