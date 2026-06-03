"use client";

import { useEffect, useState } from "react";
import { getLeaveRequestsByDate, getPendingLeaveRequests, getActiveEmployees } from "@/lib/firestore";
import { todayStr, formatDateThai, buildLineCopyText } from "@/lib/utils";
import type { LeaveRequest, Employee } from "@/types";
import { LEAVE_TYPE_COLORS } from "@/types";
import { Copy, Check } from "lucide-react";

export default function HRDashboard() {
  const [todayRequests, setTodayRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());

  useEffect(() => {
    getActiveEmployees().then((emps) => {
      const map: Record<string, Employee> = {};
      emps.forEach((e) => (map[e.id] = e));
      setEmployees(map);
    });
  }, []);

  useEffect(() => {
    Promise.all([
      getLeaveRequestsByDate(selectedDate),
      getPendingLeaveRequests(),
    ]).then(([today, pending]) => {
      setTodayRequests(today);
      setPendingRequests(pending);
    }).finally(() => setLoading(false));
  }, [selectedDate]);

  function handleCopy() {
    const records = todayRequests.map((r) => ({
      name: r.employeeName,
      branchNumber: employees[r.employeeId]?.branchNumber ?? 0,
      leaveTypeName: r.leaveTypeName,
    }));
    const text = buildLineCopyText(selectedDate, records);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold text-gray-900">ภาพรวม</h1>

      {/* Pending approvals badge */}
      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-yellow-800 font-medium">
            รออนุมัติลาป่วย {pendingRequests.length} รายการ
          </p>
          <a href="/hr/leave-approvals" className="text-sm text-yellow-700 underline">
            ดู
          </a>
        </div>
      )}

      {/* Daily summary */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">สรุปรายวัน</p>
            <p className="text-xs text-gray-400">{formatDateThai(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input text-xs py-1 px-2 w-36"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center gap-1 py-1 px-3 text-sm"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? "คัดลอกแล้ว" : "คัดลอก"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : todayRequests.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-400">
            ไม่มีพนักงานหยุดวันนี้
          </p>
        ) : (
          <div className="space-y-2">
            {todayRequests.map((r) => {
              const emp = employees[r.employeeId];
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  {emp?.lineProfilePic ? (
                    <img src={emp.lineProfilePic} className="w-8 h-8 profile-pic shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm">👤</div>
                  )}
                  <p className="text-sm font-medium text-gray-800 flex-1 min-w-0">
                    {emp ? (
                      <>
                        <span className="text-gray-400 font-normal text-xs">[{emp.branchNumber}]</span>{" "}
                        {emp.nickname}
                        <span className="text-gray-500 font-normal"> • {emp.firstName} {emp.lastName}</span>
                      </>
                    ) : r.employeeName}
                  </p>
                  <span className={`badge ${LEAVE_TYPE_COLORS[r.leaveTypeCode]} shrink-0`}>
                    {r.leaveTypeName}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
