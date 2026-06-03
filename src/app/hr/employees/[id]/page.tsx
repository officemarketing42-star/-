"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getActiveEmployees,
  getLeaveRequestsByEmployee,
  getLeaveBalancesByEmployee,
} from "@/lib/firestore";
import { getCurrentYearMonth, formatDateThai, formatMonthThai } from "@/lib/utils";
import type { Employee, LeaveRequest, LeaveBalance } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from "@/types";
import { ArrowLeft } from "lucide-react";

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

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const { year, month } = getCurrentYearMonth();

  useEffect(() => {
    async function load() {
      const employees = await getActiveEmployees();
      const emp = employees.find((e) => e.id === id) ?? null;
      setEmployee(emp);
      if (emp) {
        const [reqs, bals] = await Promise.all([
          getLeaveRequestsByEmployee(emp.id),
          getLeaveBalancesByEmployee(emp.id, year, month),
        ]);
        setRequests(reqs);
        setBalances(bals);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4">
        <p className="text-gray-500">ไม่พบข้อมูลพนักงาน</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={16} /> กลับ
      </button>

      {/* Employee profile */}
      <div className="card flex items-center gap-4">
        {employee.lineProfilePic ? (
          <img src={employee.lineProfilePic} className="w-14 h-14 rounded-full object-cover border-2 border-green-100" alt="" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">👤</div>
        )}
        <div>
          <p className="font-bold text-gray-900 text-base">
            [{employee.branchNumber}] {employee.nickname}
          </p>
          <p className="text-sm text-gray-600">{employee.firstName} {employee.lastName}</p>
          {employee.isHR && (
            <span className="badge bg-green-100 text-green-700 text-xs mt-1">HR</span>
          )}
        </div>
      </div>

      {/* Leave balances this month */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          วันลาคงเหลือ — {formatMonthThai(year, month)}
        </p>
        {balances.length === 0 ? (
          <div className="card text-center py-4 text-gray-400 text-sm">
            ยังไม่มีข้อมูลเดือนนี้
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {balances.map((b) => {
              const total = b.initialQuota + b.adjustment + b.carriedOver;
              return (
                <div key={b.id} className="card space-y-1">
                  <span className={`badge text-xs ${LEAVE_TYPE_COLORS[b.leaveTypeCode]}`}>
                    {LEAVE_TYPE_LABELS[b.leaveTypeCode]}
                  </span>
                  <p className="text-lg font-bold text-gray-900">{b.remaining} <span className="text-xs font-normal text-gray-400">วัน</span></p>
                  <p className="text-xs text-gray-400">ใช้ {b.used} / {total} วัน</p>
                  {b.carriedOver > 0 && (
                    <p className="text-xs text-blue-400">ยกมา {b.carriedOver} วัน</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leave history */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          ประวัติการลาทั้งหมด ({requests.length} รายการ)
        </p>
        {requests.length === 0 ? (
          <div className="card text-center py-4 text-gray-400 text-sm">
            ยังไม่มีประวัติการลา
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="card space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`badge text-xs ${LEAVE_TYPE_COLORS[r.leaveTypeCode]}`}>
                    {r.leaveTypeName}
                  </span>
                  <span className={`badge text-xs ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {r.dates.length === 1
                    ? formatDateThai(r.dates[0])
                    : `${formatDateThai(r.dates[0])} – ${formatDateThai(r.dates[r.dates.length - 1])}`}
                  <span className="text-gray-400 text-xs ml-1">({r.totalDays} วัน)</span>
                </p>
                {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                {r.isUnpaid && (
                  <p className="text-xs text-amber-600 font-medium">หักจากฐานเงินเดือน</p>
                )}
                {r.status === "rejected" && r.rejectedReason && (
                  <p className="text-xs text-red-500">เหตุผล: {r.rejectedReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
