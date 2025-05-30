import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as api from '../api';

interface User {
  user_id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.token) {
      setUser(res.user);
      setTokenState(res.token);
      api.setToken(res.token);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (username: string, email: string, password: string) => {
    return api.register({ username, email, password });
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    api.setToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) {
      try {
        const parsedUser = typeof u === 'string' ? JSON.parse(u) : u;
        if (parsedUser && parsedUser.user_id && parsedUser.email) {
          setTokenState(t);
          setUser(parsedUser);
          api.setToken(t);
        } else {
          // fallback: clear invalid user
          setUser(null);
          setTokenState(null);
          api.setToken('');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        setUser(null);
        setTokenState(null);
        api.setToken('');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}; 