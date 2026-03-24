"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { clearStoredToken, getStoredToken, storeToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

const AuthContext = createContext(null);

function normalizeUserProfile(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    fullName: user.fullName || user.name || "",
    collegeName: user.collegeName || "",
    phoneNumber: user.phoneNumber || user.phone || "",
    name: user.name || user.fullName || "",
    phone: user.phone || user.phoneNumber || "",
    city: user.city || "",
    state: user.state || "",
    address: user.address || "",
    bio: user.bio || "",
    qualification: user.qualification || "",
    currentDegree: user.currentDegree || ""
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (nextToken) => {
    const data = await apiRequest("/users/me", {
      headers: {
        Authorization: `Bearer ${nextToken}`
      },
      cache: "no-store"
    });

    const normalizedUser = normalizeUserProfile(data.user);
    setUser(normalizedUser);
    return normalizedUser;
  };

  useEffect(() => {
    const savedToken = getStoredToken();

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    setToken(savedToken);

    fetchProfile(savedToken)
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const data = await apiRequest("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    storeToken(data.token);
    setToken(data.token);
    await fetchProfile(data.token);
  };

  const signup = async ({ fullName, email, password, collegeName, phoneNumber }) => {
    const payload = {
      fullName: fullName.trim(),
      email,
      password,
      collegeName: collegeName.trim()
    };

    if (phoneNumber?.trim()) {
      payload.phoneNumber = phoneNumber.trim();
    }

    await apiRequest("/users/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      signup,
      refreshProfile: async () => {
        if (!token) {
          return null;
        }

        return fetchProfile(token);
      }
    }),
    [isLoading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
