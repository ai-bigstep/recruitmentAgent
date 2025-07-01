import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import axios from 'axios';
import {jwtDecode} from 'jwt-decode';
// Define types for user and context value
interface User {
  id: string;
  email: string;
  role: string;
}
// JWT payload interface must match what you encode in backend
interface JwtPayload {
  id: string;
  email: string;
  role: string;
  exp?: number; // optional expiration
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Record<string, any>) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to consume auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    
    const token = localStorage.getItem('token');
    if (token) {
      
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        console.log('Decoded token:', decoded);
        setUser({
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error('Invalid token');
        console.error('Token decoding failed:', err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post<{
        token: string;
        user: User;
      }>('http://localhost:5000/api/auth/login', { email, password });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return true;
    } catch (error) {
      return false;
    }
  };

  const register = async (userData: Record<string, any>): Promise<boolean> => {
    try {
      const response = await axios.post<{
        token: string;
        user: User;
      }>('http://localhost:5000/api/auth/register', userData);

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      return true;
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
