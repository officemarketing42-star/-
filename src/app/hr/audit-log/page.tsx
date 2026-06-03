"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/firestore";
import type { AuditLog } from "@/types";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  employee_created: "เพิ่มพนักงาน",
  employee_updated: "แก้ไขพนักงาน",
  employee_resigned: "บันทึกลาออก",
  leave_requested: "แจ้งลา",
  leave_approved: "อนุมัติลา",
  leave_rejected: "ปฏิเสธลา",
  leave_adjustment: "เพิ่มวันลา",
  quota_updated: "อัปเดตโควต้า",
  public_holiday_added: "เพิ่มวันนักขัตฤกษ์",
  pay_period_created: "สร้างรอบตัด",
  pay_period_closed: "ปิดรอบตัด",
  year_closed: "ปิดปี",
};

const ACTION_COLORS: Record<string, string> = {
  employee_created: "bg-blue-100 text-blue-700",
  employee_updated: "bg-yellow-100 text-yellow-700",
  employee_resigned: "bg-red-100 text-red-700",
  leave_approved: "bg-green-100 text-green-700",
  leave_rejected: "bg-red-100 text-red-700",
  leave_adjustment: "bg-purple-100 text-purple-700",
  pay_period_created: "bg-blue-100 text-blue-700",
  pay_period_closed: "bg-gray-100 text-gray-600",
  year_closed: "bg-orange-100 text-orange-700",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200).then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">ประวัติการแก้ไข</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ยังไม่มีประวัติ
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`badge text-xs ${
                    ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {log.createdAt?.toDate
                    ? format(log.createdAt.toDate(), "d MMM yy HH:mm", { locale: th })
                    : ""}
                </span>
              </div>
              <p className="text-sm text-gray-700">{log.detail}</p>
              <p className="text-xs text-gray-400">โดย {log.performedByName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
