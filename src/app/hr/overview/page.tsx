"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getActiveEmployees,
  getLeaveBalancesByEmployee,
  createLeaveAdjustment,
  addAuditLog,
} from "@/lib/firestore";
import { getCurrentYearMonth, formatMonthThai } from "@/lib/utils";
import type { Employee, LeaveBalance, LeaveTypeCode } from "@/types";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_COLORS } from "@/types";
import { Search, Pencil, Check, CheckCircle } from "lucide-react";
import { ProfilePic } from "@/components/ProfilePic";
import { Timestamp } from "firebase/firestore";

const ADJUSTABLE_TYPES: LeaveTypeCode[] = ["SICK", "MATERNITY", "PERSONAL", "PUBLIC_HOLIDAY"];

interface EmployeeWithBalances {
  employee: Employee;
  balances: LeaveBalance[];
}

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeWithBalances[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [editTarget, setEditTarget] = useState<EmployeeWithBalances | null>(null);
  const [picPreview, setPicPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const { year, month } = getCurrentYearMonth();

  async function load() {
    setLoading(true);
    const employees = await getActiveEmployees();
    const results = await Promise.all(
      employees.map(async (emp) => ({
        employee: emp,
        balances: await getLeaveBalancesByEmployee(emp.id, year, month),
      }))
    );
    setData(results);
    setLoading(false);
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const branches = Array.from(new Set(data.map((d) => d.employee.branchNumber))).sort((a, b) => a - b);

  const filtered = data.filter((d) => {
    const emp = d.employee;
    const matchBranch = branchFilter === "all" || String(emp.branchNumber) === branchFilter;
    const matchSearch =
      !search ||
      emp.firstName.includes(search) ||
      emp.lastName.includes(search) ||
      emp.nickname.includes(search) ||
      String(emp.branchNumber).includes(search);
    return matchBranch && matchSearch;
  });

  return (
    <div className="p-4 space-y-4">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={16} />
            </div>
            <p className="font-semibold text-sm">{toast}</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-lg font-bold text-gray-900">วันลาทุกคน</h1>
        <p className="text-xs text-gray-400">{formatMonthThai(year, month)}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="ค้นหาชื่อ ชื่อเล่น สาขา..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-28"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => (
            <option key={b} value={String(b)}>สาขา {b}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูล</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ employee: emp, balances }) => (
            <div
              key={emp.id}
              onClick={() => router.push(`/hr/employees/${emp.id}`)}
              className="card cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors space-y-2"
            >
              <div className="flex items-center gap-3">
                {emp.lineProfilePic ? (
                  <ProfilePic
                    src={emp.lineProfilePic}
                    className="w-12 h-12 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setPicPreview(emp.lineProfilePic!); }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-lg">👤</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    <span className="text-gray-400 font-normal text-xs">[{emp.branchNumber}]</span>{" "}
                    {emp.nickname}
                    <span className="text-gray-500 font-normal"> • {emp.firstName} {emp.lastName}</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">กดเพื่อดูประวัติ →</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTarget({ employee: emp, balances });
                  }}
                  className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-white shrink-0"
                  title="ปรับวันลา"
                >
                  <Pencil size={15} />
                </button>
              </div>

              {balances.length === 0 ? (
                <p className="text-xs text-gray-300 pl-1">ยังไม่มีข้อมูลวันลาเดือนนี้</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {balances.map((b) => (
                    <span
                      key={b.id}
                      className={`badge text-xs ${LEAVE_TYPE_COLORS[b.leaveTypeCode]}`}
                    >
                      {LEAVE_TYPE_LABELS[b.leaveTypeCode]}: เหลือ {b.remaining} วัน
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <EditLeaveModal
          data={editTarget}
          year={year}
          month={month}
          currentUserId={user?.employee?.id ?? ""}
          currentUserName={`${user?.employee?.firstName ?? ""} ${user?.employee?.lastName ?? ""}`}
          onClose={() => setEditTarget(null)}
          onSaved={(msg) => { setEditTarget(null); load(); showToast(msg); }}
        />
      )}

      {picPreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPicPreview(null)}
        >
          <img
            src={picPreview}
            className="w-64 h-64 rounded-full object-cover shadow-2xl"
            alt=""
          />
        </div>
      )}
    </div>
  );
}

function EditLeaveModal({
  data,
  year,
  month,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
}: {
  data: EmployeeWithBalances;
  year: number;
  month: number;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [selectedType, setSelectedType] = useState<LeaveTypeCode>("SICK");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { employee: emp, balances } = data;
  const currentBalance = balances.find((b) => b.leaveTypeCode === selectedType);

  async function handleSave() {
    setSaving(true);
    try {
      await createLeaveAdjustment({
        employeeId: emp.id,
        leaveTypeCode: selectedType,
        days,
        reason: reason.trim() || `ปรับ${LEAVE_TYPE_LABELS[selectedType]}`,
        addedBy: currentUserId,
        year,
        month,
        createdAt: Timestamp.now(),
      });
      await addAuditLog(
        "leave_adjustment",
        currentUserId,
        currentUserName,
        `ปรับ${LEAVE_TYPE_LABELS[selectedType]} ${days > 0 ? "+" : ""}${days} วัน → ${emp.nickname} (${emp.firstName} ${emp.lastName})`
      );
      onSaved(`ปรับ${LEAVE_TYPE_LABELS[selectedType]} ${days > 0 ? "+" : ""}${days} วัน → ${emp.nickname} สำเร็จ`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">ปรับวันลา</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="text-gray-500 font-medium">[{emp.branchNumber}] {emp.nickname}</span> • {emp.firstName} {emp.lastName}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors text-sm">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Leave type tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {ADJUSTABLE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
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

          {/* Current balance */}
          {currentBalance ? (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">ยอดคงเหลือปัจจุบัน</p>
              <p className="text-sm font-bold text-gray-900">
                {currentBalance.remaining} <span className="text-xs font-normal text-gray-400">วัน</span>
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">ยังไม่มียอดเดือนนี้ — จะสร้างใหม่อัตโนมัติ</p>
            </div>
          )}

          {/* Days picker */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 shrink-0">จำนวนวัน:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDays((d) => d - 1)}
                className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-lg flex items-center justify-center"
              >
                −
              </button>
              <span className={`w-10 text-center font-bold text-lg ${days > 0 ? "text-green-600" : days < 0 ? "text-red-600" : "text-gray-400"}`}>
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

          {/* Reason */}
          <input
            className="input"
            placeholder="เหตุผล (ถ้ามี)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button
              onClick={handleSave}
              disabled={saving || days === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> บันทึก...</>
              ) : (
                <><Check size={14} /> {days > 0 ? `+${days}` : days} วัน</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
