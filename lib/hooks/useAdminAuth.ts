// lib/hooks/useAdminAuth.ts — Admin authentication state via sessionStorage
"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface AdminAuth {
  secret: string;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  login: (secret: string) => Promise<boolean>;
  logout: () => void;
  /** Fetch wrapper that injects the admin Bearer token */
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuth>({
  secret: "",
  isAuthenticated: false,
  loading: true,
  error: "",
  login: async () => false,
  logout: () => {},
  adminFetch: async () => new Response(),
});

export function useAdminAuth(): AdminAuth {
  return useContext(AdminAuthContext);
}

export { AdminAuthContext };

const STORAGE_KEY = "invopap_admin_auth";

export function useAdminAuthProvider(): AdminAuth {
  const [secret, setSecret] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSecret(stored);
        // Validate stored secret
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${stored}` },
        }).then((res) => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (adminSecret: string): Promise<boolean> => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      if (res.ok) {
        setSecret(adminSecret);
        setIsAuthenticated(true);
        sessionStorage.setItem(STORAGE_KEY, adminSecret);
        setLoading(false);
        return true;
      }
      if (res.status === 401) {
        setError("Invalid admin secret");
      } else {
        setError("Failed to connect");
      }
      setLoading(false);
      return false;
    } catch {
      setError("Network error");
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setSecret("");
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const adminFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${secret}`,
        },
      });
    },
    [secret]
  );

  return { secret, isAuthenticated, loading, error, login, logout, adminFetch };
}
