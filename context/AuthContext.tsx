import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, type User } from '@/services/auth';
import { TOKEN_KEY, USER_KEY, setOnUnauthorized } from '@/services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User | null | undefined) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
      const inAuthGroup = segments[0] === 'login';
      if (!inAuthGroup) {
        router.replace('/login');
      }
    });
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Storage read failed, user stays logged out
    } finally {
      setIsLoading(false);
    }
  }

  const sendOtp = useCallback(async (phone: string) => {
    await authApi.sendOtp(phone);
  }, []);

  const verifyOtp = useCallback(async (
    phone: string,
    otp: string,
  ): Promise<User> => {
    const response = await authApi.verifyOtp({ phone, otp });
    await AsyncStorage.setItem(TOKEN_KEY, response.data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Logout API failed, still clear local state
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User | null | undefined) => {
    if (!updatedUser) return;
    setUser(updatedUser);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        sendOtp,
        verifyOtp,
        logout,
        updateUser,
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
