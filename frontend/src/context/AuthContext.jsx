import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { authService } from '../services/authService';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(
    () => localStorage.getItem('pendingVerificationEmail') || '',
  );

  const checkAuth = useCallback(async () => {
    try {
      const response = await authService.check();
      if (response.authenticated) {
        setUser(response.user);
        localStorage.removeItem('user');
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setUser(response.user);
        localStorage.removeItem('user');
        setPendingVerificationEmail('');
        localStorage.removeItem('pendingVerificationEmail');
        toast.success('Welcome back!');
        return { success: true };
      }
      if (response.requires_verification && response.verification_email) {
        setPendingVerificationEmail(response.verification_email);
        localStorage.setItem('pendingVerificationEmail', response.verification_email);
      }
      toast.error(response.message || 'Login failed');
      return {
        success: false,
        message: response.message,
        requiresVerification: !!response.requires_verification,
        verificationEmail: response.verification_email || email,
      };
    } catch {
      toast.error('Network error');
      return { success: false, message: 'Network error' };
    }
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    try {
      const response = await authService.register(name, email, password, role);
      if (response.success) {
        if (response.user) {
          setUser(response.user);
          localStorage.removeItem('user');
        }
        if (response.requires_verification && response.verification_email) {
          setPendingVerificationEmail(response.verification_email);
          localStorage.setItem('pendingVerificationEmail', response.verification_email);
        }
        toast.success(response.message || 'Registration successful!');
        const result = {
          success: true,
          message: response.message,
          requiresVerification: !!response.requires_verification,
          verificationEmail: response.verification_email || email,
          verificationCode: response.verification_code ?? null,
        };
        return result;
      }
      toast.error(response.message || 'Registration failed');
      return { success: false, message: response.message };
    } catch {
      toast.error('Network error');
      return { success: false, message: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // proceed with logout regardless
    }
    setUser(null);
    setPendingVerificationEmail('');
    localStorage.removeItem('pendingVerificationEmail');
    localStorage.removeItem('user');
    toast.success('Logged out');
  }, []);

  const verifyEmail = useCallback(async (email, code) => {
    try {
      const response = await authService.verifyCode(email, code);
      if (response.success) {
        setPendingVerificationEmail('');
        localStorage.removeItem('pendingVerificationEmail');
        await checkAuth();
        toast.success(response.message || 'Email verified!');
      } else {
        toast.error(response.message || 'Verification failed');
      }
      return response;
    } catch {
      toast.error('Network error');
      return { success: false, message: 'Network error' };
    }
  }, [checkAuth]);

  const resendCode = useCallback(async (email) => {
    try {
      const response = await authService.resendCode(email);
      if (response.success) {
        toast.success(response.message || 'Code resent');
      } else {
        toast.error(response.message || 'Failed to resend code');
      }
      return response;
    } catch {
      toast.error('Network error');
      return { success: false, message: 'Network error' };
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('user/profile', data);
      if (response.success) {
        setUser(prev => ({ ...prev, ...(response.user || data) }));
        toast.success('Profile updated');
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
      return response;
    } catch {
      toast.error('Network error');
      return { success: false, message: 'Network error' };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isMusician: user?.role === 'musician',
        isAudience: user?.role === 'audience',
        isPremium: user?.subscription_status === 'premium',
        pendingVerificationEmail,
        login,
        register,
        logout,
        verifyCode: verifyEmail,
        resendCode,
        updateProfile,
        refreshUser: checkAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
