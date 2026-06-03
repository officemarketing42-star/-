"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getLeaveBalancesByEmployee,
  createLeaveRequest,
} from "@/lib/firestore";
import { getCurrentYearMonth, todayStr, formatDateThai } from "@/lib/utils";
import type { LeaveBalance, LeaveTypeCode } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from "@/types";
import { Timestamp } from "firebase/firestore";
import { AlertTriangle, CheckCircle, ClipboardList } from "lucide-react";

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    if (cur.getDay() !== 0) { // ข้ามวันอาทิตย์
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + "T00:00:00").getDay() === 0;
}

export default function LeaveRequestPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([todayStr()]);
  const [selectedType, setSelectedType] = useState<LeaveTypeCode | "UNPAID" | "">("");
  const [rangeStart, setRangeStart] = useState(todayStr());
  const [rangeEnd, setRangeEnd] = useState(todayStr());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [sickSubmitted, setSickSubmitted] = useState(false);

  const { year, month } = getCurrentYearMonth();

  useEffect(() => {
    if (!user?.employee) return;
    getLeaveBalancesByEmployee(user.employee.id, year, month)
      .then(setBalances)
      .finally(() => setLoadingBalances(false));
  }, [user]);

  const isMaternity = selectedType === "MATERNITY";
  // [].every() is true — guard with length > 0
  const allUsed = balances.length > 0 && balances.every((b) => b.remaining <= 0);

  const effectiveDates =
    isMaternity && rangeStart && rangeEnd && rangeEnd >= rangeStart
      ? getDatesInRange(rangeStart, rangeEnd)
      : selectedDates;

  function toggleDate(date: string) {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.employee || !selectedType || effectiveDates.length === 0) return;
    setLoading(true);
    try {
      const emp = user.employee;
      const isUnpaid = selectedType === "UNPAID";
      const leaveTypeCode = selectedType as LeaveTypeCode;

      await createLeaveRequest({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        leaveTypeCode: isUnpaid ? "UNPAID" : leaveTypeCode,
        leaveTypeName: LEAVE_TYPE_LABELS[isUnpaid ? "UNPAID" : leaveTypeCode],
        dates: effectiveDates.sort(),
        totalDays: effectiveDates.length,
        status: leaveTypeCode === "SICK" ? "pending" : "recorded",
        isUnpaid,
        payPeriodId: null,
        note,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
        submittedByHR: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      if (selectedType === "SICK") {
        setSickSubmitted(true);
      } else {
        router.push("/employee/history");
      }
    } catch {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  // ── Sick leave success screen ──────────────────────────────────────────────
  if (sickSubmitted) {
    return (
      <div className="p-6 flex flex-col items-center text-center space-y-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">ส่งคำขอลาป่วยแล้ว</h2>
          <p className="text-sm text-gray-500 mt-1">รอ HR อนุมัติ</p>
        </div>
        <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">อย่าลืมส่งใบรับรองแพทย์</p>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            กรุณาส่งใบรับรองแพทย์ให้ HR โดยตรง เพื่อประกอบการอนุมัติการลาป่วย
          </p>
        </div>
        <button onClick={() => router.push("/employee/history")} className="btn-primary w-full">
          ดูประวัติการลา
        </button>
        <button
          onClick={() => { setSickSubmitted(false); setSelectedType(""); setNote(""); }}
          className="btn-secondary w-full"
        >
          แจ้งลาอีกครั้ง
        </button>
      </div>
    );
  }

  // ── Leave form ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-5">
      <h1 className="text-lg font-bold text-gray-900">แจ้งลา</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Leave type */}
        <div className="card space-y-2">
          <label className="text-sm font-medium text-gray-700">ประเภทลา</label>

          {loadingBalances ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">ยังไม่มีโควต้าวันลา กรุณาติดต่อ HR</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => {
                const label = LEAVE_TYPE_LABELS[b.leaveTypeCode];
                const color = LEAVE_TYPE_COLORS[b.leaveTypeCode];
                const disabled = b.remaining <= 0;
                return (
                  <button
                    key={b.leaveTypeCode}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedType(b.leaveTypeCode)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      selectedType === b.leaveTypeCode
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span className={`badge ${color}`}>{label}</span>
                    <span className="text-sm text-gray-600">
                      เหลือ <strong>{b.remaining}</strong> วัน
                    </span>
                  </button>
                );
              })}

              {allUsed && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">วันหยุดทุกประเภทหมดแล้ว</p>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">
                    การลาครั้งนี้จะบันทึกเป็นวันหยุดหักจากฐานเงินเดือน HR จะเป็นผู้ดำเนินการ
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedType("UNPAID")}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      selectedType === "UNPAID"
                        ? "border-amber-500 bg-amber-100"
                        : "border-amber-300 bg-white"
                    }`}
                  >
                    <span className="badge bg-gray-100 text-gray-700">หักฐานเงินเดือน</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Date picker — adapts to leave type */}
        {selectedType && (
          <div className="card space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {isMaternity ? "ช่วงวันที่ลาคลอด" : "เลือกวันที่"}
            </label>

            {isMaternity ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">วันเริ่มต้น</label>
                    <input
                      type="date"
                      className="input"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">วันสิ้นสุด</label>
                    <input
                      type="date"
                      className="input"
                      value={rangeEnd}
                      min={rangeStart}
                      onChange={(e) => setRangeEnd(e.target.value)}
                    />
                  </div>
                </div>
                {effectiveDates.length > 0 && (
                  <p className="text-xs text-green-700 font-medium bg-green-50 rounded-lg px-3 py-2">
                    รวม {effectiveDates.length} วัน &nbsp;•&nbsp;
                    {formatDateThai(effectiveDates[0])} – {formatDateThai(effectiveDates[effectiveDates.length - 1])}
                  </p>
                )}
              </div>
            ) : (
              <>
                <input
                  type="date"
                  className="input"
                  value={selectedDates[0] ?? ""}
                  onChange={(e) => setSelectedDates([e.target.value])}
                />
                {selectedDates[0] && isSunday(selectedDates[0]) && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    วันอาทิตย์เป็นวันหยุดประจำสัปดาห์ ไม่สามารถแจ้งลาได้
                  </p>
                )}
                <p className="text-xs text-gray-400">กดวันที่ด้านล่างเพื่อยกเลิก</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDates.map((d) => (
                    <span
                      key={d}
                      className="badge bg-green-100 text-green-700 cursor-pointer"
                      onClick={() => toggleDate(d)}
                    >
                      {formatDateThai(d)} ✕
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. Note */}
        {selectedType && (
          <div className="card space-y-2">
            <label className="text-sm font-medium text-gray-700">หมายเหตุ (ถ้ามี)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="เหตุผลการลา..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading || !selectedType || effectiveDates.length === 0 || (!isMaternity && !!selectedDates[0] && isSunday(selectedDates[0]))}
        >
          {loading ? "กำลังบันทึก..." : "ยืนยันการแจ้งลา"}
        </button>

        {selectedType === "SICK" && (
          <p className="text-xs text-center text-gray-400">
            ลาป่วยต้องรอ HR อนุมัติ • เตรียมใบรับรองแพทย์ไว้ด้วย
          </p>
        )}
      </form>
    </div>
  );
}
