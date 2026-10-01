/**
 * Zamzam Foods Authentication Context
 *
 * Hydration strategy:
 *   1. Instantly restore cached user from localStorage (no loading flash)
 *   2. Validate against /auth/me/ in the background using Bearer header & HttpOnly cookies
 *   3. If access token is expired, apiClient auto-calls /auth/refresh/ silently with mutex locking
 *   4. User stays logged in seamlessly across page refreshes and devices.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialSession = (): { user: User | null; status: AuthStatus; isLoading: boolean } => {
  const storedUser = authService.getStoredUser();
  const token = localStorage.getItem('zamzam_access_token');
  const refresh = localStorage.getItem('zamzam_refresh_token');

  if (storedUser && (token || refresh)) {
    // Session available in cache: mark authenticated immediately to avoid redirect/flicker
    return {
      user: storedUser,
      status: 'AUTHENTICATED',
      isLoading: false,
    };
  }

  if (token || refresh) {
    // Tokens present but profile missing from cache: initialize while loading
    return {
      user: null,
      status: 'INITIALIZING',
      isLoading: true,
    };
  }

  // Completely unauthenticated
  return {
    user: null,
    status: 'UNAUTHENTICATED',
    isLoading: false,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initial] = useState(getInitialSession);
  const [user, setUser] = useState<User | null>(initial.user);
  const [status, setStatus] = useState<AuthStatus>(initial.status);
  const [isLoading, setIsLoading] = useState<boolean>(initial.isLoading);

  /**
   * Validate user session in the background.
   * Never logs out due to transient network drops, 502/503/504 errors, or server cold starts.
   */
  const refreshUser = useCallback(async () => {
    const accessToken = localStorage.getItem('zamzam_access_token');
    const refreshToken = localStorage.getItem('zamzam_refresh_token');
    const storedUser = authService.getStoredUser();

    // If completely unauthenticated
    if (!accessToken && !refreshToken && !storedUser) {
      setUser(null);
      setStatus('UNAUTHENTICATED');
      setIsLoading(false);
      return;
    }

    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      localStorage.setItem('zamzam_user', JSON.stringify(freshUser));
      setStatus('AUTHENTICATED');
    } catch (err: unknown) {
      // Check if this was a definitive session rejection
      const isSessionExpired = err instanceof Error && err.message.includes('Session expired');
      const tokensCleared = !localStorage.getItem('zamzam_access_token') && !localStorage.getItem('zamzam_refresh_token');

      if (isSessionExpired || tokensCleared) {
        setUser(null);
        localStorage.removeItem('zamzam_user');
        setStatus('UNAUTHENTICATED');
      } else if (storedUser) {
        // Transient network error, 500, or Railway cold start:
        // KEEP stored user active so the session is never lost on refresh!
        setUser(storedUser);
        setStatus('AUTHENTICATED');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Validate session on startup
    refreshUser();

    // Handle explicit server-confirmed logout
    const handleLogoutEvent = () => {
      setUser(null);
      localStorage.removeItem('zamzam_user');
      setStatus('UNAUTHENTICATED');
      setIsLoading(false);
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, [refreshUser]);

  const login = async (username: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      setStatus('AUTHENTICATED');
      return res.user;
    } catch (err) {
      setStatus('UNAUTHENTICATED');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('UNAUTHENTICATED');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: status === 'AUTHENTICATED' && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
