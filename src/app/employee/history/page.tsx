"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getLeaveRequestsByEmployee } from "@/lib/firestore";
import { formatDateThai } from "@/lib/utils";
import type { LeaveRequest } from "@/types";
import { LEAVE_TYPE_COLORS } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  recorded: "บันทึกแล้ว",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  recorded: "bg-blue-100 text-blue-700",
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.employee) return;
    getLeaveRequestsByEmployee(user.employee.id)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">ประวัติการลา</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-24 bg-gray-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ยังไม่มีประวัติการลา
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`badge ${LEAVE_TYPE_COLORS[r.leaveTypeCode]}`}
                >
                  {r.leaveTypeName}
                </span>
                <span className={`badge ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>

              <div className="text-sm text-gray-700">
                {r.dates.length === 1 ? (
                  <span>{formatDateThai(r.dates[0])}</span>
                ) : (
                  <span>
                    {formatDateThai(r.dates[0])} – {formatDateThai(r.dates[r.dates.length - 1])}
                    {" "}({r.totalDays} วัน)
                  </span>
                )}
              </div>

              {r.note && (
                <p className="text-xs text-gray-400">{r.note}</p>
              )}

              {r.status === "rejected" && r.rejectedReason && (
                <p className="text-xs text-red-500">
                  เหตุผล: {r.rejectedReason}
                </p>
              )}

              {r.isUnpaid && (
                <p className="text-xs text-amber-600 font-medium">
                  หักจากฐานเงินเดือน
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
