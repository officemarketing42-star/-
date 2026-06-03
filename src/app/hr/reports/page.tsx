"use client";

import { useEffect, useState } from "react";
import {
  getLeaveRequestsByDate,
  getLeaveRequestsByDateRange,
  getActiveEmployees,
  getAllPayPeriods,
} from "@/lib/firestore";
import {
  formatDateThai,
  buildLineCopyText,
  exportToCSV,
  todayStr,
} from "@/lib/utils";
import type { LeaveRequest, Employee, PayPeriod } from "@/types";
import { LEAVE_TYPE_COLORS } from "@/types";
import { Copy, Check, Download } from "lucide-react";
import { ProfilePic } from "@/components/ProfilePic";

export default function ReportsPage() {
  const [mode, setMode] = useState<"daily" | "period">("daily");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getActiveEmployees(), getAllPayPeriods()]).then(([emps, periods]) => {
      const map: Record<string, Employee> = {};
      emps.forEach((e) => (map[e.id] = e));
      setEmployees(map);
      setPeriods(periods);
      if (periods.length > 0) setSelectedPeriodId(periods[0].id);
    });
  }, []);

  async function fetchDaily() {
    setLoading(true);
    const data = await getLeaveRequestsByDate(selectedDate);
    setRequests(data);
    setLoading(false);
  }

  async function fetchPeriod() {
    if (!selectedPeriodId) return;
    setLoading(true);
    const period = periods.find((p) => p.id === selectedPeriodId);
    if (!period) { setLoading(false); return; }
    const results = await getLeaveRequestsByDateRange(period.startDate, period.endDate);
    setRequests(results);
    setLoading(false);
  }

  // Auto-fetch when mode or date changes
  useEffect(() => {
    if (mode === "daily") fetchDaily();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, mode]);

  useEffect(() => {
    if (mode === "period" && selectedPeriodId) fetchPeriod();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriodId, mode, periods]);

  const branches = Array.from(new Set(Object.values(employees).map((e) => e.branchNumber))).sort((a, b) => a - b);

  const filtered = requests.filter((r) => {
    if (branchFilter === "all") return true;
    const emp = employees[r.employeeId];
    return emp && String(emp.branchNumber) === branchFilter;
  }).sort((a, b) => {
    const ba = employees[a.employeeId]?.branchNumber ?? 0;
    const bb = employees[b.employeeId]?.branchNumber ?? 0;
    return ba - bb;
  });

  function handleCopy() {
    const records = filtered.map((r) => ({
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

  function handleExport() {
    const rows = filtered.map((r) => {
      const emp = employees[r.employeeId];
      return {
        สาขา: emp?.branchNumber ?? "",
        ชื่อ: r.employeeName,
        ชื่อเล่น: emp?.nickname ?? "",
        ประเภทลา: r.leaveTypeName,
        วันที่: r.dates.join(", "),
        จำนวนวัน: r.totalDays,
        สถานะ: r.status,
        หมายเหตุ: r.note,
      };
    });
    const period = periods.find((p) => p.id === selectedPeriodId);
    const filename = mode === "period" && period
      ? `รายงาน_${period.name}.csv`
      : `รายงาน_${selectedDate}.csv`;
    exportToCSV(rows, filename);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">รายงาน</h1>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setMode("daily")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${mode === "daily" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
        >
          รายวัน
        </button>
        <button
          onClick={() => setMode("period")}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${mode === "period" ? "bg-white shadow-sm font-medium" : "text-gray-500"}`}
        >
          ตามรอบตัด
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {mode === "daily" ? (
          <input
            type="date"
            className="input flex-1"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        ) : (
          <select
            className="input flex-1"
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sundayCount} อาทิตย์)
              </option>
            ))}
          </select>
        )}
        <select
          className="input w-28"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => <option key={b} value={String(b)}>สาขา {b}</option>)}
        </select>
      </div>

      {/* Actions */}
      {filtered.length > 0 && (
        <div className="flex gap-2">
          {mode === "daily" && (
            <button
              onClick={handleCopy}
              className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-2"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? "คัดลอกแล้ว" : "คัดลอกส่ง LINE"}
            </button>
          )}
          <button
            onClick={handleExport}
            className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-2"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-14 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ไม่มีข้อมูล กด "ดู" เพื่อโหลด
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">ทั้งหมด {filtered.length} รายการ</p>
          {filtered.map((r) => {
            const emp = employees[r.employeeId];
            return (
              <div key={r.id} className="card flex items-center gap-3">
                {emp?.lineProfilePic ? (
                  <ProfilePic src={emp.lineProfilePic} className="w-9 h-9" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base">👤</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {emp ? (
                      <>
                        <span className="text-gray-400 font-normal text-xs">[{emp.branchNumber}]</span>{" "}
                        {emp.nickname}
                        <span className="text-gray-500 font-normal"> • {emp.firstName} {emp.lastName}</span>
                      </>
                    ) : r.employeeName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.dates.map(formatDateThai).join(", ")}
                  </p>
                </div>
                <span className={`badge ${LEAVE_TYPE_COLORS[r.leaveTypeCode]}`}>
                  {r.leaveTypeName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
