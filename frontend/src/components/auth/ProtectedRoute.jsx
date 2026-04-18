import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (
    roles?.includes("musician") &&
    user.role === "musician" &&
    Number(user.is_approved) !== 1
  ) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md p-8 text-center">
        <h2 className="text-xl font-bold text-amber-200">Awaiting approval</h2>
        <p className="text-white/70 mt-2 text-sm">
          Your musician account is pending admin approval.
        </p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
