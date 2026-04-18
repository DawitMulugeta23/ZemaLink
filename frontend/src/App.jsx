import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import MusicPlayer from "./components/music/MusicPlayer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import AdminRegistered from "./pages/AdminRegistered";
import AdminDashboard from "./pages/AdminDashboard";
import Browse from "./pages/Browse";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Login from "./pages/Login";
import MusicianDashboard from "./pages/MusicianDashboard";
import Premium from "./pages/Premium";
import ProDeal from "./pages/ProDeal";
import Playlist from "./pages/Playlist";
import Profile from "./pages/Profile";
import Purchased from "./pages/Purchased";
import Register from "./pages/Register";
import Subscription from "./pages/Subscription";
import VerifyEmail from "./pages/VerifyEmail";

function App() {
  return (
    <Router>
      <AuthProvider>
        <PlayerProvider>
          <div
            className="min-h-screen bg-fixed bg-center bg-cover bg-no-repeat"
            style={{
              backgroundImage: "url('/assets/images/d.jpg')",
            }}
          >
            <div className="min-h-screen bg-black/30">
              <Navbar />
              <div className="flex pt-16">
                <Sidebar />
                <main className="flex-1 ml-0 md:ml-72 pt-4 pb-24 px-4 md:px-8">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/browse" element={<Browse />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/playlist/:id" element={<Playlist />} />
                    <Route path="/premium" element={<Premium />} />
                    <Route
                      path="/pro-deal"
                      element={
                        <ProtectedRoute>
                          <ProDeal />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/subscription"
                      element={
                        <ProtectedRoute>
                          <Subscription />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/profile" element={<Profile />} />
                    <Route
                      path="/purchased"
                      element={
                        <ProtectedRoute>
                          <Purchased />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin-registered"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminRegistered />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin-dashboard"
                      element={
                        <ProtectedRoute roles={["admin"]}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/musician-dashboard"
                      element={
                        <ProtectedRoute roles={["musician"]}>
                          <MusicianDashboard />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </main>
              </div>
              <MusicPlayer />
              <ToastContainer position="top-right" autoClose={3000} theme="dark" />
            </div>
          </div>
        </PlayerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
