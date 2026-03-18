"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { ApiError, apiRequest } from "./api";

type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await apiRequest<{ user: AuthUser }>("/auth/me");
      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        setUser(null);
        return;
      }

      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await apiRequest<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password }
    });

    setUser(response.user);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST"
    });

    setUser(null);
  }, []);

  useEffect(() => {
    async function loadUser(): Promise<void> {
      await refreshUser();
      setIsLoading(false);
    }

    void loadUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      refreshUser
    }),
    [user, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
