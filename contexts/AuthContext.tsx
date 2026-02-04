
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, UserRole } from '../types';
import { useAppStore } from '../services/storage';

interface AuthContextType {
  user: Employee | null;
  login: (codeOrEmail: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { employees } = useAppStore();
  const [user, setUser] = useState<Employee | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('kpi_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (codeOrEmail: string, password: string) => {
    // 1. Normalize Input
    const inputIdentifier = codeOrEmail.toString().trim().toLowerCase();
    const inputPassword = password.toString().trim();

    console.log("Attempting login with:", inputIdentifier);

    // 2. Find User with robust matching
    const foundUser = employees.find(e => {
      // Convert sheet data to string and trim safe
      const sheetCode = (e.code || '').toString().trim().toLowerCase();
      const sheetEmail = (e.email || '').toString().trim().toLowerCase();
      const sheetPassword = (e.password || '').toString().trim(); 

      const isUserMatch = sheetCode === inputIdentifier || sheetEmail === inputIdentifier;
      const isPassMatch = sheetPassword === inputPassword;

      return isUserMatch && isPassMatch;
    });

    if (foundUser) {
      // 3. Normalize Role for Session
      // This ensures that even if Sheet has "Manager" or "manager ", it becomes "manager"
      const normalizedUser = {
        ...foundUser,
        role: (foundUser.role || '').toString().trim().toLowerCase() as UserRole
      };

      setUser(normalizedUser);
      localStorage.setItem('kpi_user', JSON.stringify(normalizedUser));
      return true;
    }
    
    console.warn("Login failed.");
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('kpi_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
