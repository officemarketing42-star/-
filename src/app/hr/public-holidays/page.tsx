"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getPublicHolidaysByYear,
  createPublicHoliday,
  createLeaveAdjustment,
  getActiveEmployees,
  addAuditLog,
} from "@/lib/firestore";
import { formatDateThai, getCurrentYearMonth } from "@/lib/utils";
import type { PublicHoliday, Employee } from "@/types";
import { Timestamp } from "firebase/firestore";
import { Plus, Gift } from "lucide-react";
import { ProfilePic } from "@/components/ProfilePic";

export default function PublicHolidaysPage() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [grantModal, setGrantModal] = useState<PublicHoliday | null>(null);

  const { year } = getCurrentYearMonth();

  async function reload() {
    setLoading(true);
    const [h, e] = await Promise.all([
      getPublicHolidaysByYear(year),
      getActiveEmployees(),
    ]);
    setHolidays(h);
    setEmployees(e);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(date: string, name: string) {
    if (!user?.employee) return;
    const dateYear = new Date(date).getFullYear();
    await createPublicHoliday({
      date,
      name,
      year: dateYear,
      addedBy: user.employee.id,
      createdAt: Timestamp.now(),
    });
    await addAuditLog(
      "public_holiday_added",
      user.employee.id,
      `${user.employee.firstName} ${user.employee.lastName}`,
      `เพิ่มวันนักขัตฤกษ์: ${name} ${formatDateThai(date)}`
    );
    setShowForm(false);
    reload();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">วันนักขัตฤกษ์ {year}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1 py-2 px-3 text-sm"
        >
          <Plus size={16} /> เพิ่มวัน
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-14 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ยังไม่มีวันนักขัตฤกษ์ปีนี้
        </div>
      ) : (
        <div className="space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                <p className="text-xs text-gray-400">{formatDateThai(h.date)}</p>
              </div>
              <button
                onClick={() => setGrantModal(h)}
                className="flex items-center gap-1 text-xs text-purple-600 border border-purple-200 rounded-lg px-2 py-1 hover:bg-purple-50"
              >
                <Gift size={12} /> มอบให้พนักงาน
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <HolidayForm onClose={() => setShowForm(false)} onCreate={handleCreate} />
      )}

      {grantModal && (
        <GrantModal
          holiday={grantModal}
          employees={employees}
          currentUser={user?.employee}
          onClose={() => setGrantModal(null)}
          onGranted={reload}
        />
      )}
    </div>
  );
}

function HolidayForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (date: string, name: string) => Promise<void>;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate(date, name);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 p-6">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">เพิ่มวันนักขัตฤกษ์</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">วันที่</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อวันหยุด</label>
            <input className="input" placeholder="เช่น วันสงกรานต์" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "กำลังบันทึก..." : "เพิ่ม"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GrantModal({
  holiday,
  employees,
  currentUser,
  onClose,
  onGranted,
}: {
  holiday: PublicHoliday;
  employees: Employee[];
  currentUser: Employee | null | undefined;
  onClose: () => void;
  onGranted: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const branches = Array.from(new Set(employees.map((e) => e.branchNumber))).sort((a, b) => a - b);
  const filtered = branchFilter === "all"
    ? employees
    : employees.filter((e) => String(e.branchNumber) === branchFilter);

  function toggleAll() {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((e) => e.id));
    }
  }

  async function handleGrant() {
    if (!currentUser || selected.length === 0) return;
    setLoading(true);
    const { year, month } = getCurrentYearMonth();
    try {
      await Promise.all(
        selected.map((empId) =>
          createLeaveAdjustment({
            employeeId: empId,
            leaveTypeCode: "PUBLIC_HOLIDAY",
            days: 1,
            reason: `วันนักขัตฤกษ์: ${holiday.name} ${formatDateThai(holiday.date)}`,
            addedBy: currentUser.id,
            year,
            month,
            createdAt: Timestamp.now(),
          })
        )
      );
      await addAuditLog(
        "leave_adjustment",
        currentUser.id,
        `${currentUser.firstName} ${currentUser.lastName}`,
        `มอบวันนักขัตฤกษ์ "${holiday.name}" ให้ ${selected.length} คน`
      );
      onGranted();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 p-6">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">มอบวันให้พนักงาน</h2>
            <p className="text-xs text-gray-400">{holiday.name} • {formatDateThai(holiday.date)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="p-4 border-b flex items-center gap-2">
          <select className="input w-32" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">ทุกสาขา</option>
            {branches.map((b) => <option key={b} value={String(b)}>สาขา {b}</option>)}
          </select>
          <button onClick={toggleAll} className="btn-secondary text-sm py-2">
            {selected.length === filtered.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}
          </button>
          <span className="text-sm text-gray-500">เลือก {selected.length} คน</span>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {filtered.map((emp) => (
            <label key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(emp.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelected((p) => [...p, emp.id]);
                  else setSelected((p) => p.filter((id) => id !== emp.id));
                }}
                className="rounded"
              />
              {emp.lineProfilePic
                ? <ProfilePic src={emp.lineProfilePic} className="w-11 h-11" />
                : <div className="w-8 h-8 rounded-full bg-gray-200 text-center leading-8">👤</div>
              }
              <div>
                <p className="text-sm font-medium">{emp.firstName} ({emp.nickname})</p>
                <p className="text-xs text-gray-400">สาขา {emp.branchNumber}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleGrant}
            disabled={selected.length === 0 || loading}
            className="btn-primary w-full"
          >
            {loading ? "กำลังบันทึก..." : `มอบให้ ${selected.length} คน`}
          </button>
        </div>
      </div>
    </div>
  );
}
