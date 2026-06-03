"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

// หน้านี้ใช้สำหรับทดสอบใน dev mode เท่านั้น
export default function DevLoginPage() {
  const { devLogin } = useAuth();
  const router = useRouter();
  const [lineId, setLineId] = useState("");

  if (process.env.NODE_ENV !== "development") {
    return <p className="p-4 text-red-500">ไม่อนุญาตใน production</p>;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!devLogin || !lineId.trim()) return;
    await devLogin(lineId.trim());
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="card space-y-4">
          <div className="text-center">
            <p className="text-xs bg-yellow-100 text-yellow-700 rounded px-2 py-1 inline-block mb-3">
              DEV MODE ONLY
            </p>
            <h1 className="font-bold text-gray-900">ทดสอบระบบ</h1>
            <p className="text-xs text-gray-400 mt-1">
              ใส่ LINE User ID เพื่อ login โดยไม่ต้องใช้ LIFF
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              className="input"
              placeholder="LINE User ID เช่น Uxxxxxxxx"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full">
              เข้าสู่ระบบ (Dev)
            </button>
          </form>

          <div className="border-t pt-3 space-y-1">
            <p className="text-xs text-gray-400 font-medium">Quick Login:</p>
            <button
              onClick={() => { setLineId("dev-hr-001"); }}
              className="w-full text-left text-xs text-blue-600 hover:underline"
            >
              → dev-hr-001 (HR Admin)
            </button>
            <button
              onClick={() => { setLineId("dev-emp-001"); }}
              className="w-full text-left text-xs text-blue-600 hover:underline"
            >
              → dev-emp-001 (พนักงาน)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
