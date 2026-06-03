"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getPendingLeaveRequests,
  updateLeaveRequestStatus,
  addAuditLog,
  getActiveEmployees,
} from "@/lib/firestore";
import { formatDateThai } from "@/lib/utils";
import type { LeaveRequest, Employee } from "@/types";
import { Check, X } from "lucide-react";

export default function LeaveApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function reload() {
    setLoading(true);
    const [data, emps] = await Promise.all([getPendingLeaveRequests(), getActiveEmployees()]);
    setRequests(data);
    const map: Record<string, Employee> = {};
    emps.forEach((e) => (map[e.id] = e));
    setEmployees(map);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function approve(req: LeaveRequest) {
    if (!user?.employee) return;
    setActionId(req.id);
    await updateLeaveRequestStatus(req.id, "approved", user.employee.id, undefined, {
      employeeId: req.employeeId,
      leaveTypeCode: req.leaveTypeCode,
      totalDays: req.totalDays,
      dates: req.dates,
    });
    await addAuditLog(
      "leave_approved",
      user.employee.id,
      `${user.employee.firstName} ${user.employee.lastName}`,
      `อนุมัติลาป่วย ${req.employeeName} ${req.dates.map(formatDateThai).join(", ")}`,
      req.id,
      req.employeeName
    );
    setActionId(null);
    reload();
  }

  async function reject(req: LeaveRequest) {
    if (!user?.employee || !rejectReason.trim()) return;
    setActionId(req.id);
    await updateLeaveRequestStatus(req.id, "rejected", user.employee.id, rejectReason);
    await addAuditLog(
      "leave_rejected",
      user.employee.id,
      `${user.employee.firstName} ${user.employee.lastName}`,
      `ปฏิเสธลาป่วย ${req.employeeName}: ${rejectReason}`,
      req.id,
      req.employeeName
    );
    setActionId(null);
    setRejectId(null);
    setRejectReason("");
    reload();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">อนุมัติลาป่วย</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ไม่มีรายการรออนุมัติ
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const emp = employees[req.employeeId];
            return (
            <div key={req.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {emp?.lineProfilePic ? (
                    <img src={emp.lineProfilePic} className="w-12 h-12 profile-pic shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xl">👤</div>
                  )}
                  <div>
                  <p className="font-semibold text-gray-900">
                    {emp ? (
                      <>
                        <span className="text-gray-400 font-normal text-xs">[{emp.branchNumber}]</span>{" "}
                        {emp.nickname}
                        <span className="text-gray-500 font-normal text-sm"> • {emp.firstName} {emp.lastName}</span>
                      </>
                    ) : req.employeeName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {req.dates.map(formatDateThai).join(", ")} ({req.totalDays} วัน)
                  </p>
                  </div>
                </div>
                <span className="badge bg-yellow-100 text-yellow-700 shrink-0">รออนุมัติ</span>
              </div>

              {req.note && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
                  {req.note}
                </p>
              )}

              {rejectId === req.id ? (
                <div className="bg-red-50 rounded-xl p-3 space-y-2.5 border border-red-100">
                  <p className="text-xs font-semibold text-red-700">ระบุเหตุผลที่ไม่อนุมัติ</p>
                  <input
                    className="input border-red-200 focus:ring-red-400"
                    placeholder="เช่น ไม่มีใบรับรองแพทย์..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRejectId(null); setRejectReason(""); }}
                      className="btn-secondary flex-1 text-sm"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => reject(req)}
                      disabled={!rejectReason.trim() || actionId === req.id}
                      className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"
                    >
                      {actionId === req.id ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> กำลังบันทึก...</>
                      ) : (
                        <><X size={14} /> ยืนยันไม่อนุมัติ</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setRejectId(req.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 active:scale-[0.97] transition-all"
                  >
                    <X size={15} /> ไม่อนุมัติ
                  </button>
                  <button
                    onClick={() => approve(req)}
                    disabled={actionId === req.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 active:scale-[0.97] transition-all shadow-sm"
                  >
                    {actionId === req.id ? (
                      <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> กำลังบันทึก...</>
                    ) : (
                      <><Check size={15} /> อนุมัติ</>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
