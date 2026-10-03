import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  currentPeriod: string;
  setCurrentPeriod: (period: string) => void;
  unitPreference: 't' | 'kg';
  setUnitPreference: (unit: 't' | 'kg') => void;
  login: (token: string, user: User, company: Company) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('carboniq_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('carboniq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [company, setCompany] = useState<Company | null>(() => {
    const saved = localStorage.getItem('carboniq_company');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentPeriod, setCurrentPeriod] = useState<string>('2026-08');
  const [unitPreference, setUnitPreference] = useState<'t' | 'kg'>('t');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('carboniq_token');
      if (storedToken) {
        try {
          const resp = await api.get('/auth/me');
          setUser(resp.data.data.user);
          setCompany(resp.data.data.company);
          if (resp.data.data.company?.settings?.defaultReportingPeriod) {
            setCurrentPeriod(resp.data.data.company.settings.defaultReportingPeriod);
          }
        } catch (e) {
          // Token invalid, clear storage
          localStorage.removeItem('carboniq_token');
          localStorage.removeItem('carboniq_user');
          localStorage.removeItem('carboniq_company');
          setToken(null);
          setUser(null);
          setCompany(null);
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = (newToken: string, newUser: User, newCompany: Company) => {
    setToken(newToken);
    setUser(newUser);
    setCompany(newCompany);
    localStorage.setItem('carboniq_token', newToken);
    localStorage.setItem('carboniq_user', JSON.stringify(newUser));
    localStorage.setItem('carboniq_company', JSON.stringify(newCompany));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem('carboniq_token');
    localStorage.removeItem('carboniq_user');
    localStorage.removeItem('carboniq_company');
    window.location.href = '/login';
  };

  const refreshMe = async () => {
    try {
      const resp = await api.get('/auth/me');
      setUser(resp.data.data.user);
      setCompany(resp.data.data.company);
      localStorage.setItem('carboniq_user', JSON.stringify(resp.data.data.user));
      localStorage.setItem('carboniq_company', JSON.stringify(resp.data.data.company));
    } catch (e) {}
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        currentPeriod,
        setCurrentPeriod,
        unitPreference,
        setUnitPreference,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        loading,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
