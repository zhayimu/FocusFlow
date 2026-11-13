import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useToast } from '../components/ui';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const toast = useToast();

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection even if already logged in
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login detail error:", error.code, error.message);
      
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return;
      }
      
      if (error.code === 'auth/popup-blocked') {
        toast('error', "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.");
        return;
      }

      toast('error', `Sign-in failed: ${error.message}
Check that this domain is listed under Firebase Authorized Domains.`);
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
