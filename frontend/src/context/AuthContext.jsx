import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState('USER');
  const { showToast } = useToast();

  // Initialize Auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedTokens = api.getTokens();
      const storedUser = localStorage.getItem('ahoum_user');

      if (storedTokens && storedTokens.access) {
        setTokens(storedTokens);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // Ignore parse error
          }
        }

        try {
          // Fetch fresh profile from backend
          const freshUser = await api.get('/auth/profile/');
          setUser(freshUser);
          localStorage.setItem('ahoum_user', JSON.stringify(freshUser));
        } catch (err) {
          console.warn('Failed to verify profile session:', err.message);
          if (err.status === 401) {
            setUser(null);
            api.setTokens(null);
            localStorage.removeItem('ahoum_user');
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleExpired = () => {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('ahoum_user');
      showToast('Your session has expired. Please sign in again.', 'info');
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [showToast]);

  const handleAuthSuccess = (userData, tokenData, successMessage) => {
    setUser(userData);
    setTokens(tokenData);
    api.setTokens(tokenData);
    localStorage.setItem('ahoum_user', JSON.stringify(userData));
    setIsAuthModalOpen(false);
    showToast(successMessage || `Signed in successfully as ${userData.role}!`, 'success');
  };

  const loginWithDemo = async (role = 'USER', customEmail = null, customName = null) => {
    try {
      const data = await api.post('/auth/demo/', {
        role,
        email: customEmail || undefined,
        name: customName || undefined,
      });
      handleAuthSuccess(data.user, data.tokens, `Signed in as Demo ${role} (${data.user.email})`);
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const loginWithGoogle = async (token, role = 'USER') => {
    try {
      const data = await api.post('/auth/google/', { token, role });
      handleAuthSuccess(data.user, data.tokens, 'Signed in with Google!');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const loginWithGitHub = async (code, role = 'USER') => {
    try {
      const data = await api.post('/auth/github/', { code, role });
      handleAuthSuccess(data.user, data.tokens, 'Signed in with GitHub!');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updated = await api.patch('/auth/profile/', profileData);
      setUser(updated);
      localStorage.setItem('ahoum_user', JSON.stringify(updated));
      showToast('Profile updated successfully!', 'success');
      return updated;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    api.setTokens(null);
    localStorage.removeItem('ahoum_user');
    showToast('Signed out successfully.', 'info');
  };

  const openAuthModal = (initialRole = 'USER') => {
    setAuthModalInitialRole(initialRole);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isCreator = user?.role === 'CREATOR' || user?.is_creator === true;

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        loading,
        isAuthenticated: !!user,
        isCreator,
        isAuthModalOpen,
        authModalInitialRole,
        openAuthModal,
        closeAuthModal,
        loginWithDemo,
        loginWithGoogle,
        loginWithGitHub,
        updateProfile,
        logout,
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
