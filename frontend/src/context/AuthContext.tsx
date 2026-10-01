/**
 * Zamzam Foods Authentication Context
 *
 * Hydration strategy:
 *   1. Instantly restore cached user from localStorage (no loading flash)
 *   2. Validate against /auth/me/ using the HttpOnly access cookie
 *   3. If access token is expired, apiClient auto-calls /auth/refresh/ silently
 *   4. If refresh also fails → user is null → redirect to /login
 *
 * Logout: calls server endpoint (blacklists refresh token, clears cookies)
 *         then clears local state.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate from cache immediately for a fast UI
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Validate the cached user by fetching /auth/me/.
   * The HttpOnly access cookie or Bearer token is sent automatically.
   * apiClient handles automatic refresh if the access token has expired.
   */
  const refreshUser = async () => {
    const accessToken = localStorage.getItem('zamzam_access_token');
    const refreshToken = localStorage.getItem('zamzam_refresh_token');
    const storedUser = authService.getStoredUser();

    // If no tokens or stored user, we are simply in unauthenticated state
    if (!accessToken && !refreshToken && !storedUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const freshUser = await authService.getCurrentUser();
      setUser(freshUser);
      localStorage.setItem('zamzam_user', JSON.stringify(freshUser));
    } catch {
      // Only clear if we actually have no valid token in storage
      const currentToken = localStorage.getItem('zamzam_access_token');
      if (!currentToken) {
        setUser(null);
        localStorage.removeItem('zamzam_user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only validate on mount if we have an active session
    refreshUser();

    // Handle server-initiated logout events (e.g. refresh token rejected)
    const handleLogoutEvent = () => {
      const currentToken = localStorage.getItem('zamzam_access_token');
      if (!currentToken) {
        setUser(null);
        localStorage.removeItem('zamzam_user');
      }
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout(); // server blacklists token + clears cookies
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
