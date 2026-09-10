'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Role, authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string, role?: Role) => Promise<User>;
  logout: () => void;
  redirectToDashboard: (role?: Role) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on client mount
    try {
      const storedToken = localStorage.getItem('nutrisun_token');
      const storedUser = localStorage.getItem('nutrisun_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const redirectToDashboard = (targetRole?: Role) => {
    const role = targetRole || user?.role;
    switch (role) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'chef':
        router.push('/dashboard/chef');
        break;
      case 'delivery':
        router.push('/dashboard/delivery');
        break;
      case 'customer':
      default:
        router.push('/dashboard/customer');
        break;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const { token: receivedToken, user: loggedUser } = response.data;
      setToken(receivedToken);
      setUser(loggedUser);
      localStorage.setItem('nutrisun_token', receivedToken);
      localStorage.setItem('nutrisun_user', JSON.stringify(loggedUser));
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    role: Role = 'customer'
  ): Promise<User> => {
    setLoading(true);
    try {
      const response = await authApi.register({ name, email, password, phone, role });
      const { token: receivedToken, user: newUser } = response.data;
      setToken(receivedToken);
      setUser(newUser);
      localStorage.setItem('nutrisun_token', receivedToken);
      localStorage.setItem('nutrisun_user', JSON.stringify(newUser));
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nutrisun_token');
    localStorage.removeItem('nutrisun_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        redirectToDashboard,
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
