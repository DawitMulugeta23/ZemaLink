import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoadingSpinner from "./components/common/LoadingSpinner";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import MusicPlayer from "./components/music/MusicPlayer";
import Background from "./components/layout/Background";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Player from "./pages/Player";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Events from "./pages/Events";
import LiveStreams from "./pages/LiveStreams";
import StreamView from "./pages/StreamView";
import MusicianDashboard from "./pages/MusicianDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegistered from "./pages/AdminRegistered";
import Subscription from "./pages/Subscription";
import Purchased from "./pages/Purchased";
import ProDeal from "./pages/ProDeal";

function AppContent() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/verify-email";

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Background />
      {!isAuthPage && (
        <>
          <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
        </>
      )}
      <div className={`${isAuthPage ? "" : "pt-16"} flex`}>
        <main
          className={`flex-1 transition-all duration-300 ${
            isAuthPage ? "" : sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
          } min-h-[calc(100vh-4rem)] pb-28 px-4 md:px-6 lg:px-8`}
        >
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Auth Required */}
            <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/player" element={<ProtectedRoute><Player /></ProtectedRoute>} />
            <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
              <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/live-streams" element={<ProtectedRoute><LiveStreams /></ProtectedRoute>} />
            <Route path="/live-streams/:id" element={<ProtectedRoute><StreamView /></ProtectedRoute>} />
            <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
            <Route path="/purchased" element={<ProtectedRoute><Purchased /></ProtectedRoute>} />
            <Route path="/pro-deal" element={<ProtectedRoute><ProDeal /></ProtectedRoute>} />
            <Route path="/pro-deal/:id" element={<ProtectedRoute><ProDeal /></ProtectedRoute>} />

            {/* Role-specific */}
            <Route
              path="/musician-dashboard"
              element={<ProtectedRoute roles={["musician"]}><MusicianDashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin-dashboard"
              element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>}
            />
            <Route
              path="/admin-registered"
              element={<ProtectedRoute roles={["admin"]}><AdminRegistered /></ProtectedRoute>}
            />
          </Routes>
        </main>
      </div>
      {user && <MusicPlayer />}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === "light" ? "light" : "dark"}
      />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
