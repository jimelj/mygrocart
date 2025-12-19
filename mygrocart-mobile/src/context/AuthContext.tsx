import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  userId: string;
  name: string;
  email: string;
  zipCode?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from AsyncStorage on mount
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      // Use SecureStore for sensitive token data (encrypted via iOS Keychain / Android Keystore)
      const storedToken = await SecureStore.getItemAsync('token');
      // Use AsyncStorage for non-sensitive user data
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      // Silent failure - user will see login screen
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    try {
      // Store token in SecureStore (encrypted) - OWASP Mobile security best practice
      await SecureStore.setItemAsync('token', newToken);
      // Store user data in AsyncStorage (non-sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      // Re-throw so caller can handle storage errors
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Remove token from SecureStore
      await SecureStore.deleteItemAsync('token');
      // Remove user data from AsyncStorage
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      // Re-throw so caller can handle storage errors
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
