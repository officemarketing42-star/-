"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getActiveEmployees, createLeaveAdjustment, addAuditLog } from "@/lib/firestore";
import { getCurrentYearMonth } from "@/lib/utils";
import type { Employee, LeaveTypeCode } from "@/types";
import { LEAVE_TYPE_LABELS } from "@/types";
import { Timestamp } from "firebase/firestore";
import { Check, CheckSquare, Square } from "lucide-react";

const LEAVE_TYPES: LeaveTypeCode[] = ["SICK", "MATERNITY", "PERSONAL", "PUBLIC_HOLIDAY"];

function empDisplay(emp: Employee) {
  return `[${emp.branchNumber}] ${emp.nickname} • ${emp.firstName} ${emp.lastName}`;
}

export default function LeaveSettingsPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedType, setSelectedType] = useState<LeaveTypeCode>("SICK");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const { year, month } = getCurrentYearMonth();

  useEffect(() => {
    getActiveEmployees().then(setEmployees).finally(() => setLoading(false));
  }, []);

  function changeType(type: LeaveTypeCode) {
    setSelectedType(type);
    setChecked(new Set());
  }

  const branches = Array.from(new Set(employees.map((e) => e.branchNumber))).sort((a, b) => a - b);
  const filtered = employees.filter(
    (e) => branchFilter === "all" || String(e.branchNumber) === branchFilter
  );

  function selectAll() {
    setChecked(new Set(filtered.map((e) => e.id)));
  }

  function clearAll() {
    setChecked(new Set());
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedEmployees = employees.filter((e) => checked.has(e.id));
  const allSelected = filtered.length > 0 && filtered.every((e) => checked.has(e.id));

  async function handleConfirm() {
    if (!user?.employee || selectedEmployees.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedEmployees.map((emp) =>
          createLeaveAdjustment({
            employeeId: emp.id,
            leaveTypeCode: selectedType,
            days,
            reason: reason.trim() || `ปรับ${LEAVE_TYPE_LABELS[selectedType]}`,
            addedBy: user.employee!.id,
            year,
            month,
            createdAt: Timestamp.now(),
          })
        )
      );
      await addAuditLog(
        "leave_adjustment",
        user.employee.id,
        `${user.employee.firstName} ${user.employee.lastName}`,
        `ปรับ${LEAVE_TYPE_LABELS[selectedType]} ${days > 0 ? "+" : ""}${days} วัน → ${selectedEmployees.length} คน: ${selectedEmployees.map((e) => e.nickname).join(", ")}`
      );
      setChecked(new Set());
      setReason("");
      setShowConfirm(false);
      alert(`บันทึกสำเร็จ ${selectedEmployees.length} คน`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">ปรับวันลา</h1>

      {/* Leave type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {LEAVE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => changeType(type)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedType === type
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {LEAVE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* จำนวนวัน */}
      <div className="card flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 shrink-0">จำนวนวัน:</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDays((d) => d - 1)}
            className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-lg flex items-center justify-center"
          >
            −
          </button>
          <span className={`w-10 text-center font-bold text-lg ${days > 0 ? "text-green-600" : "text-red-600"}`}>
            {days > 0 ? `+${days}` : days}
          </span>
          <button
            onClick={() => setDays((d) => d + 1)}
            className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 text-green-600 font-bold text-lg flex items-center justify-center"
          >
            ＋
          </button>
        </div>
        <p className="text-xs text-gray-400">ลบได้ถ้าต้องการหักวัน</p>
      </div>

      {/* Filters + Select All */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="input w-28"
          value={branchFilter}
          onChange={(e) => { setBranchFilter(e.target.value); setChecked(new Set()); }}
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => (
            <option key={b} value={String(b)}>สาขา {b}</option>
          ))}
        </select>

        <button
          onClick={allSelected ? clearAll : selectAll}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
        >
          {allSelected
            ? <><CheckSquare size={15} /> ยกเลิกทั้งหมด</>
            : <><Square size={15} /> เลือกทั้งหมด</>
          }
        </button>

        {checked.size > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="btn-primary flex items-center gap-1 py-2 px-3 text-sm ml-auto"
          >
            <Check size={14} /> บันทึก ({checked.size} คน)
          </button>
        )}
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-14 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp) => {
            const isChecked = checked.has(emp.id);
            return (
              <div
                key={emp.id}
                onClick={() => toggle(emp.id)}
                className={`card flex items-center gap-3 cursor-pointer transition-colors ${
                  isChecked ? "border-green-400 bg-green-50" : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isChecked ? "bg-green-600 border-green-600" : "border-gray-300"
                }`}>
                  {isChecked && <Check size={13} className="text-white" strokeWidth={3} />}
                </div>

                {emp.lineProfilePic ? (
                  <img src={emp.lineProfilePic} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">👤</div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-gray-400 text-xs mr-1">[{emp.branchNumber}]</span>
                    {emp.nickname}
                    <span className="text-gray-500 font-normal"> • {emp.firstName} {emp.lastName}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${days > 0 ? "bg-green-100" : "bg-red-100"}`}>
                    <span className="text-lg">{days > 0 ? "➕" : "➖"}</span>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">ยืนยันการปรับวันลา</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {LEAVE_TYPE_LABELS[selectedType]} &nbsp;
                      <span className={`font-semibold ${days > 0 ? "text-green-600" : "text-red-500"}`}>
                        {days > 0 ? `+${days}` : days} วัน
                      </span>
                      &nbsp;• เดือน {month}/{year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Employee list */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-0.5">
              <p className="text-xs text-gray-400 mb-2">{selectedEmployees.length} คน</p>
              {selectedEmployees
                .sort((a, b) => a.branchNumber - b.branchNumber)
                .map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <p className="text-sm text-gray-800">
                      <span className="text-gray-400 text-xs mr-1">[{emp.branchNumber}]</span>
                      {emp.nickname}
                      <span className="text-gray-500 text-xs"> • {emp.firstName} {emp.lastName}</span>
                    </p>
                    <span className={`text-sm font-bold tabular-nums ${days > 0 ? "text-green-600" : "text-red-500"}`}>
                      {days > 0 ? `+${days}` : days}
                    </span>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-gray-100 space-y-3 bg-gray-50/50 rounded-b-2xl">
              <input
                className="input"
                placeholder="เหตุผล (ถ้ามี)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> บันทึก...</>
                  ) : (
                    <><Check size={15} /> ยืนยัน {selectedEmployees.length} คน</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
