"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getLeaveBalancesByEmployee,
  getOpenPayPeriod,
  getWeeklyOffBalanceByPeriod,
} from "@/lib/firestore";
import { getCurrentYearMonth, formatMonthThai, todayStr } from "@/lib/utils";
import type { LeaveBalance, PayPeriod } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from "@/types";
import { Sun } from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [openPeriod, setOpenPeriod] = useState<PayPeriod | null>(null);
  const [weeklyBal, setWeeklyBal] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const { year, month } = getCurrentYearMonth();

  useEffect(() => {
    if (!user?.employee) return;
    Promise.all([
      getLeaveBalancesByEmployee(user.employee.id, year, month),
      getOpenPayPeriod(),
    ]).then(async ([bals, period]) => {
      setBalances(bals.filter((b) => b.leaveTypeCode !== "WEEKLY_OFF"));
      setOpenPeriod(period);
      if (period) {
        const wb = await getWeeklyOffBalanceByPeriod(user.employee!.id, period.id);
        setWeeklyBal(wb);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const nickname = user?.employee?.nickname ?? user?.displayName ?? "";

  const today = todayStr();
  const passedSundays = openPeriod ? openPeriod.sundayDates.filter((d) => d <= today) : [];
  const usedSundays = weeklyBal?.used ?? 0;
  const workedSundays = Math.max(0, passedSundays.length - usedSundays);

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
      ) : (
        <div className="space-y-3">
          {/* Pay period / Sunday card — only show after first Sunday has passed */}
          {openPeriod && passedSundays.length > 0 && (
            <div className="card border-green-200 bg-green-50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Sun size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{openPeriod.name}</p>
                    <p className="text-xs text-gray-500">
                      ผ่านมาแล้ว {passedSundays.length} / {openPeriod.sundayCount} อาทิตย์
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700">{workedSundays}</p>
                  <p className="text-xs text-gray-500">วันเงินพิเศษ</p>
                </div>
              </div>
              {passedSundays.length > 0 && (
                <div className="w-full bg-white rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(passedSundays.length / openPeriod.sundayCount) * 100}%` }}
                  />
                </div>
              )}
              {usedSundays > 0 && (
                <p className="text-xs text-orange-500">หยุดอาทิตย์ {usedSundays} วัน</p>
              )}
            </div>
          )}

          {/* Regular leave balances */}
          {balances.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">
              ยังไม่มีข้อมูลวันลาเดือนนี้
            </div>
          ) : (
            balances.map((b) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}
