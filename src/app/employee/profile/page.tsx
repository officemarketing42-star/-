"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { liffLogout } from "@/lib/liff";
import Image from "next/image";

export default function ProfilePage() {
  const { user } = useAuth();
  const emp = user?.employee;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">โปรไฟล์</h1>

      {emp && (
        <div className="card space-y-4">
          <div className="flex items-center gap-4">
            {user?.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt="profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-green-100"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                👤
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {emp.firstName} {emp.lastName}
              </p>
              <p className="text-sm text-gray-400">
                ชื่อเล่น: {emp.nickname}
              </p>
              <p className="text-sm text-gray-400">
                สาขา: {emp.branchNumber}
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs text-gray-400">
              LINE Display Name: {user?.displayName}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={liffLogout}
        className="btn-secondary w-full text-red-500 border-red-200 hover:bg-red-50"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}
