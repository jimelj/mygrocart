"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { LOGIN, SIGNUP } from "./graphql/queries";

interface User {
  userId: string;
  email: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  travelRadiusMiles?: number;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

interface SignupInput {
  email: string;
  password: string;
  name: string;
  zipCode: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [loginMutation] = useMutation(LOGIN);
  const [signupMutation] = useMutation(SIGNUP);

  // Load token from localStorage on mount
  useEffect(() => {
    // Guard against server-side rendering
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error loading stored auth:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await loginMutation({
          variables: { email, password },
        });

        if ((data as any)?.login) {
          const { token: newToken, user: newUser } = (data as any).login;
          setToken(newToken);
          setUser(newUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem("auth_token", newToken);
            localStorage.setItem("auth_user", JSON.stringify(newUser));
          }
        }
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    [loginMutation]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      try {
        const { data } = await signupMutation({
          variables: {
            email: input.email,
            password: input.password,
            name: input.name,
            zipCode: input.zipCode,
          },
        });

        if ((data as any)?.signup) {
          const { token: newToken, user: newUser } = (data as any).signup;
          setToken(newToken);
          setUser(newUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem("auth_token", newToken);
            localStorage.setItem("auth_user", JSON.stringify(newUser));
          }
        }
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      }
    },
    [signupMutation]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    signup,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
