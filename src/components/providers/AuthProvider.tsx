"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { AuthUser } from "@/types";
import { initLiff, getLiffProfile, liffIsLoggedIn, liffLogin } from "@/lib/liff";
import { getEmployeeByLineId } from "@/lib/firestore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  devLogin?: (lineUserId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_STORAGE_KEY = "dev_line_user_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromLineId = async (lineUserId: string, displayName: string, pictureUrl: string) => {
    const employee = await getEmployeeByLineId(lineUserId);
    setUser({
      lineUserId,
      displayName,
      pictureUrl,
      employee,
      isLinked: !!employee,
      isHR: employee?.isHR ?? false,
      isHRAdmin: employee?.isHRAdmin ?? false,
    });
  };

  const load = async () => {
    let redirecting = false;
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!liffId) {
        if (IS_DEV) {
          const savedId = localStorage.getItem(DEV_STORAGE_KEY);
          if (savedId) {
            await loadFromLineId(savedId, "Dev User", "");
          }
        }
        return;
      }

      await initLiff();

      if (!liffIsLoggedIn()) {
        redirecting = true;
        liffLogin();
        return;
      }

      const profile = await getLiffProfile();
      await loadFromLineId(profile.userId, profile.displayName, profile.pictureUrl ?? "");
    } catch (err) {
      console.error("Auth error", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!redirecting) setLoading(false);
    }
  };

  const devLogin = async (lineUserId: string) => {
    localStorage.setItem(DEV_STORAGE_KEY, lineUserId);
    await loadFromLineId(lineUserId, "Dev User", "");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh: load, devLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
