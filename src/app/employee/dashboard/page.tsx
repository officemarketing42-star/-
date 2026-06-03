"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getLeaveBalancesByEmployee } from "@/lib/firestore";
import { getCurrentYearMonth, formatMonthThai } from "@/lib/utils";
import type { LeaveBalance } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from "@/types";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const { year, month } = getCurrentYearMonth();

  useEffect(() => {
    if (!user?.employee) return;
    getLeaveBalancesByEmployee(user.employee.id, year, month)
      .then(setBalances)
      .finally(() => setLoading(false));
  }, [user]);

  const nickname = user?.employee?.nickname ?? user?.displayName ?? "";

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">สวัสดี {nickname}</h1>
        <p className="text-sm text-gray-500">{formatMonthThai(year, month)}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20 bg-gray-100" />
          ))}
        </div>
      ) : balances.length === 0 ? (
        <div className="card text-center py-8 text-gray-400 text-sm">
          ยังไม่มีข้อมูลวันลาเดือนนี้
        </div>
      ) : (
        <div className="space-y-3">
          {balances.map((b) => {
            const label = LEAVE_TYPE_LABELS[b.leaveTypeCode];
            const color = LEAVE_TYPE_COLORS[b.leaveTypeCode];
            const total = b.initialQuota + b.adjustment + b.carriedOver;
            const pct = total > 0 ? (b.used / total) * 100 : 0;

            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${color}`}>{label}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    เหลือ {b.remaining} วัน
                  </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100 - pct, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <span>ใช้แล้ว {b.used} วัน</span>
                  <span>ทั้งหมด {total} วัน</span>
                </div>

                {b.carriedOver > 0 && (
                  <p className="text-xs text-blue-500 mt-1">
                    ยกมา {b.carriedOver} วัน
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
