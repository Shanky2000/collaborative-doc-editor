import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface AuthState {
  token: string | null;
  username: string | null;
  email: string | null;
  userId: number | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, username: string, email: string, userId: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set default base URL for API requests.
// This supports local development as well as reading the backend URL from environment variables for production.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Global Axios configuration
axios.defaults.baseURL = API_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    email: localStorage.getItem('email'),
    userId: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
    loading: true,
  });

  useEffect(() => {
    // Configure interceptor for requests
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Configure interceptor for 401 unauthorized to clear session
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    setState((prev) => ({ ...prev, loading: false }));

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = (token: string, username: string, email: string, userId: number) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    localStorage.setItem('userId', String(userId));
    
    setState({
      token,
      username,
      email,
      userId,
      loading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    
    setState({
      token: null,
      username: null,
      email: null,
      userId: null,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
