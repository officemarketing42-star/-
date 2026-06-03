"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getAllPayPeriods,
  createPayPeriod,
  closePayPeriod,
  addAuditLog,
  createWeeklyOffBalancesForPeriod,
  getWeeklyOffSummaryByPeriod,
} from "@/lib/firestore";
import { getSundaysInRange, formatDateThai, todayStr } from "@/lib/utils";
import type { PayPeriod } from "@/types";
import { Timestamp } from "firebase/firestore";
import { Plus, Lock, AlertTriangle, Check } from "lucide-react";

export default function PayPeriodsPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [summaryPeriodId, setSummaryPeriodId] = useState<string | null>(null);
  const [summary, setSummary] = useState<import("@/types").LeaveBalance[]>([]);
  const [confirmClose, setConfirmClose] = useState<PayPeriod | null>(null);
  const [closing, setClosing] = useState(false);

  async function reload() {
    setLoading(true);
    const data = await getAllPayPeriods();
    setPeriods(data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(name: string, start: string, end: string) {
    if (!user?.employee) return;
    const sundays = getSundaysInRange(start, end);

    const periodId = await createPayPeriod({
      name,
      startDate: start,
      endDate: end,
      sundayDates: sundays,
      sundayCount: sundays.length,
      status: "open",
      createdBy: user.employee.id,
      createdAt: Timestamp.now(),
      closedAt: null,
    });

    // แจก WEEKLY_OFF ให้พนักงานทุกคนอัตโนมัติ
    await createWeeklyOffBalancesForPeriod(periodId, sundays.length, start);

    await addAuditLog(
      "pay_period_created",
      user.employee.id,
      `${user.employee.firstName} ${user.employee.lastName}`,
      `สร้างรอบตัด: ${name} (${formatDateThai(start)} – ${formatDateThai(end)}) ${sundays.length} อาทิตย์ — แจก WEEKLY_OFF ให้พนักงานแล้ว`
    );
    setShowForm(false);
    reload();
  }

  async function handleViewSummary(period: PayPeriod) {
    setSummaryPeriodId(period.id);
    const data = await getWeeklyOffSummaryByPeriod(period.id);
    setSummary(data.sort((a, b) => a.employeeId.localeCompare(b.employeeId)));
  }

  async function handleClose() {
    if (!user?.employee || !confirmClose) return;
    setClosing(true);
    await closePayPeriod(confirmClose.id);
    await addAuditLog(
      "pay_period_closed",
      user.employee.id,
      `${user.employee.firstName} ${user.employee.lastName}`,
      `ปิดรอบตัด: ${confirmClose.name}`,
      confirmClose.id,
      confirmClose.name
    );
    setConfirmClose(null);
    setClosing(false);
    reload();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">รอบตัดจ่าย</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1 py-2 px-3 text-sm"
        >
          <Plus size={16} /> สร้างรอบ
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : periods.length === 0 ? (
        <div className="card text-center py-10 text-gray-400 text-sm">
          ยังไม่มีรอบตัด
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <div key={p.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDateThai(p.startDate)} – {formatDateThai(p.endDate)}
                  </p>
                </div>
                <span
                  className={`badge ${
                    p.status === "open"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.status === "open" ? "เปิดอยู่" : "ปิดแล้ว"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  วันอาทิตย์ในรอบ:{" "}
                  {p.status === "open" ? (
                    <strong className="text-gray-900">
                      {p.sundayDates.filter(d => d <= todayStr()).length} / {p.sundayCount} วัน
                    </strong>
                  ) : (
                    <strong className="text-gray-900">{p.sundayCount} วัน</strong>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewSummary(p)}
                    className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50"
                  >
                    สรุปเงินพิเศษ
                  </button>
                  {p.status === "open" && (
                    <button
                      onClick={() => setConfirmClose(p)}
                      className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
                    >
                      <Lock size={12} /> ปิดรอบ
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {(p.status === "open"
                  ? p.sundayDates.filter(d => d <= todayStr())
                  : p.sundayDates
                ).map((d) => (
                  <span key={d} className="badge bg-blue-50 text-blue-600 text-xs">
                    {formatDateThai(d)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PayPeriodForm
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Confirm close period modal */}
      {confirmClose && (
        <div className="modal-overlay">
          <div className="modal-sheet p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">ปิดรอบตัด?</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">{confirmClose.name}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  หลังปิดแล้วจะไม่สามารถเปิดใหม่ได้ ข้อมูลวันอาทิตย์จะถูกล็อก
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmClose(null)}
                className="btn-secondary flex-1"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClose}
                disabled={closing}
                className="btn-danger flex-1 flex items-center justify-center gap-1.5"
              >
                {closing ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> กำลังปิด...</>
                ) : (
                  <><Lock size={14} /> ยืนยันปิดรอบ</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* สรุปเงินพิเศษ Modal */}
      {summaryPeriodId && (
        <div className="modal-overlay">
          <div className="modal-sheet max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">สรุปวันอาทิตย์</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  เหลือ = ทำงานวันอาทิตย์ = รับเงินพิเศษ
                </p>
              </div>
              <button
                onClick={() => setSummaryPeriodId(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {summary.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">
                  ยังไม่มีข้อมูล
                </p>
              ) : (
                summary.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm text-gray-800">{b.employeeId}</p>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        ใช้ {b.used} / {b.initialQuota} วัน
                      </p>
                      <p className="text-sm font-bold text-green-600">
                        เงินพิเศษ {b.remaining} วัน
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayPeriodForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, start: string, end: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const preview =
    form.startDate && form.endDate && form.endDate >= form.startDate
      ? getSundaysInRange(form.startDate, form.endDate)
      : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate(form.name, form.startDate, form.endDate);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-sheet">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">สร้างรอบตัดใหม่</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อรอบ</label>
            <input
              className="input"
              placeholder="เช่น มิถุนายน 2568"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">วันเริ่ม</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">วันสิ้นสุด</label>
              <input
                type="date"
                className="input"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                required
              />
            </div>
          </div>

          {preview.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">
                วันอาทิตย์ในรอบนี้: {preview.length} วัน
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.map((d) => (
                  <span key={d} className="badge bg-blue-100 text-blue-700 text-xs">
                    {formatDateThai(d)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1.5" disabled={loading}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> กำลังสร้าง...</>
              ) : (
                <><Plus size={15} /> สร้างรอบ</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
