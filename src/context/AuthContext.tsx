import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  sendPasswordReset,
  resendVerificationEmail,
  logoutUser,
  updateUserDisplayName,
  changeUserPassword,
  deleteUserAccountWithReauth,
} from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string, name: string) => Promise<any>;
  loginGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  deleteAccount: (pass?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, pass: string) => loginWithEmail(email, pass);
  const signup = (email: string, pass: string, name: string) =>
    registerWithEmail(email, pass, name);
  const loginGoogle = () => loginWithGoogle();
  const logout = () => logoutUser();
  const resetPassword = (email: string) => sendPasswordReset(email);
  const resendVerification = async () => {
    if (user) await resendVerificationEmail(user);
  };
  const updateName = (name: string) => updateUserDisplayName(name);
  const changePassword = (oldPass: string, newPass: string) =>
    changeUserPassword(oldPass, newPass);
  const deleteAccount = (pass?: string) => deleteUserAccountWithReauth(pass);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginGoogle,
        logout,
        resetPassword,
        resendVerification,
        updateName,
        changePassword,
        deleteAccount,
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
