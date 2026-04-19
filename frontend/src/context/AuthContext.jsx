import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(
    () => localStorage.getItem("pendingVerificationEmail") || "",
  );

  const checkAuth = async () => {
    try {
      const response = await authService.check();
      if (response.authenticated) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setUser(response.user);
        setPendingVerificationEmail("");
        localStorage.removeItem("pendingVerificationEmail");
        return { success: true };
      } else {
        if (response.requires_verification && response.verification_email) {
          setPendingVerificationEmail(response.verification_email);
          localStorage.setItem("pendingVerificationEmail", response.verification_email);
        }
        return {
          success: false,
          message: response.message,
          requiresVerification: !!response.requires_verification,
          verificationEmail: response.verification_email || email,
        };
      }
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await authService.register(name, email, password, role);
      if (response.success) {
        if (response.user) {
          setUser(response.user);
        }
        if (response.requires_verification && response.verification_email) {
          setPendingVerificationEmail(response.verification_email);
          localStorage.setItem("pendingVerificationEmail", response.verification_email);
        }
        return {
          success: true,
          message: response.message,
          requiresVerification: !!response.requires_verification,
          verificationEmail: response.verification_email || email,
          verificationCode: response.verification_code ?? null,
        };
      } else {
        return { success: false, message: response.message };
      }
    } catch (err) {
      return { success: false, message: "Network error" };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const verifyCode = async (email, code) => {
    const response = await authService.verifyCode(email, code);
    if (response.success) {
      setPendingVerificationEmail("");
      localStorage.removeItem("pendingVerificationEmail");
    }
    return response;
  };

  const resendCode = async (email) => {
    return await authService.resendCode(email);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        verifyCode,
        resendCode,
        pendingVerificationEmail,
        refreshUser: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
