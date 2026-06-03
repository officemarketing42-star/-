"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { AuthUser } from "@/types";
import { initLiff, getLiffProfile } from "@/lib/liff";
import { getEmployeeByLineId } from "@/lib/firestore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  devLogin?: (lineUserId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_STORAGE_KEY = "dev_line_user_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

      // Dev mode without LIFF ID: ใช้ localStorage แทน
      if (!liffId) {
        if (IS_DEV) {
          const savedId = localStorage.getItem(DEV_STORAGE_KEY);
          if (savedId) {
            await loadFromLineId(savedId, "Dev User", "");
          }
        }
        // Production without LIFF ID: หยุด loading ให้หน้าแสดง "เปิดผ่าน LINE"
        return;
      }

      await initLiff();
      const profile = await getLiffProfile();
      if (!profile) return;
      await loadFromLineId(profile.userId, profile.displayName, profile.pictureUrl ?? "");
    } catch (err) {
      console.error("Auth error", err);
    } finally {
      setLoading(false);
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
    <AuthContext.Provider value={{ user, loading, refresh: load, devLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
