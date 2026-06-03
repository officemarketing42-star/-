"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  addAuditLog,
  batchCreateEmployees,
} from "@/lib/firestore";
import type { Employee } from "@/types";
import { Timestamp } from "firebase/firestore";
import { UserPlus, Search, UserX, Pencil, Check, Upload, Download, AlertCircle } from "lucide-react";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setLoading(true);
    const data = await getAllEmployees();
    setEmployees(data);
    setFiltered(data);
    setLoading(false);
  }

  useEffect(() => {
    let result = employees;
    if (branchFilter !== "all") {
      result = result.filter((e) => String(e.branchNumber) === branchFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.firstName.toLowerCase().includes(s) ||
          e.lastName.toLowerCase().includes(s) ||
          e.nickname.toLowerCase().includes(s)
      );
    }
    setFiltered(result);
  }, [search, branchFilter, employees]);

  const branches = [...new Set(employees.map((e) => e.branchNumber))].sort(
    (a, b) => a - b
  );

  function openEdit(emp: Employee) {
    setEditTarget(emp);
    setShowForm(true);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">พนักงาน</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary flex items-center gap-1 py-2 px-3 text-sm"
          >
            <Upload size={15} /> Import CSV
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-1 py-2 px-3 text-sm"
          >
            <UserPlus size={16} /> เพิ่ม
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8"
            placeholder="ค้นหาชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-32"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">ทุกสาขา</option>
          {branches.map((b) => (
            <option key={b} value={String(b)}>
              สาขา {b}
            </option>
          ))}
        </select>
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-16 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((emp) => (
            <div key={emp.id} className="card flex items-center gap-3">
              {emp.lineProfilePic ? (
                <img
                  src={emp.lineProfilePic}
                  alt={emp.firstName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                  👤
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  <span className="text-gray-400 font-normal text-xs">[{emp.branchNumber}]</span>{" "}
                  {emp.nickname}
                  <span className="text-gray-500 font-normal"> • {emp.firstName} {emp.lastName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!emp.isActive && (
                  <span className="badge bg-gray-100 text-gray-500">ลาออก</span>
                )}
                {emp.isHR && (
                  <span className="badge bg-green-100 text-green-700">HR</span>
                )}
                <button
                  onClick={() => openEdit(emp)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <EmployeeForm
          employee={editTarget}
          currentUser={user?.employee}
          onClose={() => setShowForm(false)}
          onSaved={reload}
        />
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportModal
          currentUser={user?.employee}
          onClose={() => setShowImport(false)}
          onImported={reload}
        />
      )}
    </div>
  );
}

// ─── Import CSV Modal ──────────────────────────────────────────────────────────

interface ParsedRow {
  firstName: string;
  lastName: string;
  nickname: string;
  branchNumber: string;
  error?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.replace(/\r/g, "").trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  const colIdx = (name: string) => headers.findIndex((h) => h === name);
  const fi = colIdx("firstname");
  const li = colIdx("lastname");
  const ni = colIdx("nickname");
  const bi = colIdx("branchnumber");
  if (fi < 0 || li < 0 || ni < 0 || bi < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: ParsedRow = {
      firstName: cols[fi] ?? "",
      lastName: cols[li] ?? "",
      nickname: cols[ni] ?? "",
      branchNumber: cols[bi] ?? "",
    };
    if (!row.firstName) row.error = "ไม่มีชื่อ";
    else if (!row.lastName) row.error = "ไม่มีนามสกุล";
    else if (!row.nickname) row.error = "ไม่มีชื่อเล่น";
    else if (!row.branchNumber || isNaN(Number(row.branchNumber)) || Number(row.branchNumber) <= 0)
      row.error = "เลขสาขาไม่ถูกต้อง";
    return row;
  });
}

function downloadTemplate() {
  const BOM = "﻿";
  const csv = BOM + "firstName,lastName,nickname,branchNumber\nสมชาย,ใจดี,ชาย,1\nสมหญิง,รักดี,หญิง,2";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ImportModal({
  currentUser,
  onClose,
  onImported,
}: {
  currentUser: Employee | undefined | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const now = Timestamp.now();
      const employees = validRows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        nickname: r.nickname,
        branchNumber: Number(r.branchNumber),
        lineUserId: null,
        lineProfilePic: null,
        isHR: false,
        isHRAdmin: false,
        isActive: true,
        resignationDate: null,
        resignationReason: null,
        nameHistory: [],
        createdAt: now,
        updatedAt: now,
      }));
      await batchCreateEmployees(employees);
      await addAuditLog(
        "employee_created",
        currentUser?.id ?? "",
        `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`,
        `Import CSV: เพิ่มพนักงาน ${validRows.length} คน`
      );
      setImported(validRows.length);
      onImported();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-sheet max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Import พนักงานจาก CSV</h2>
            <p className="text-xs text-gray-400 mt-0.5">รองรับ UTF-8, Excel (.csv)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {imported > 0 ? (
            /* Success state */
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={28} className="text-green-600" />
              </div>
              <p className="font-bold text-gray-900">นำเข้าสำเร็จ {imported} คน</p>
              <button onClick={onClose} className="btn-primary px-8">ปิด</button>
            </div>
          ) : (
            <>
              {/* Template download */}
              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors"
              >
                <Download size={15} /> ดาวน์โหลดแม่แบบ CSV
              </button>

              {/* File upload */}
              <label className="block cursor-pointer">
                <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  fileName ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <Upload size={24} className={`mx-auto mb-2 ${fileName ? "text-green-500" : "text-gray-300"}`} />
                  {fileName ? (
                    <p className="text-sm font-medium text-green-700">{fileName}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">กดเพื่อเลือกไฟล์ CSV</p>
                      <p className="text-xs text-gray-400 mt-1">columns: firstName, lastName, nickname, branchNumber</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </label>

              {/* Preview */}
              {rows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-gray-500">พบ {rows.length} แถว</p>
                    <div className="flex gap-2">
                      {validRows.length > 0 && (
                        <span className="badge bg-green-100 text-green-700">✓ {validRows.length} ถูกต้อง</span>
                      )}
                      {invalidRows.length > 0 && (
                        <span className="badge bg-red-100 text-red-600">✕ {invalidRows.length} มีปัญหา</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">ชื่อ-นามสกุล</th>
                          <th className="text-left px-3 py-2 text-gray-500 font-medium">ชื่อเล่น</th>
                          <th className="text-center px-3 py-2 text-gray-500 font-medium">สาขา</th>
                          <th className="text-center px-3 py-2 text-gray-500 font-medium">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className={`border-t border-gray-50 ${r.error ? "bg-red-50" : ""}`}>
                            <td className="px-3 py-2 text-gray-800">
                              {r.firstName} {r.lastName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{r.nickname}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{r.branchNumber}</td>
                            <td className="px-3 py-2 text-center">
                              {r.error ? (
                                <span className="flex items-center justify-center gap-1 text-red-500">
                                  <AlertCircle size={12} /> {r.error}
                                </span>
                              ) : (
                                <Check size={13} className="text-green-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {imported === 0 && validRows.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary flex-1 flex items-center justify-center gap-1.5"
            >
              {importing ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> กำลัง import...</>
              ) : (
                <><Upload size={14} /> นำเข้า {validRows.length} คน</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee Form ─────────────────────────────────────────────────────────────

function EmployeeForm({
  employee,
  currentUser,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  currentUser: Employee | undefined | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!employee;
  const [form, setForm] = useState({
    firstName: employee?.firstName ?? "",
    lastName: employee?.lastName ?? "",
    nickname: employee?.nickname ?? "",
    branchNumber: employee?.branchNumber ? String(employee.branchNumber) : "",
    isHR: employee?.isHR ?? false,
    isHRAdmin: employee?.isHRAdmin ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [showResign, setShowResign] = useState(false);
  const [resignDate, setResignDate] = useState("");
  const [resignReason, setResignReason] = useState("");

  function set(key: string, val: unknown) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nickname: form.nickname.trim(),
        branchNumber: Number(form.branchNumber),
        isHR: form.isHR,
        isHRAdmin: form.isHRAdmin,
      };

      if (isEdit && employee) {
        const nameChanged =
          data.firstName !== employee.firstName ||
          data.lastName !== employee.lastName;

        const updates: Partial<Employee> = { ...data, updatedAt: Timestamp.now() };

        if (nameChanged) {
          updates.nameHistory = [
            ...(employee.nameHistory ?? []),
            {
              oldFirstName: employee.firstName,
              oldLastName: employee.lastName,
              newFirstName: data.firstName,
              newLastName: data.lastName,
              changedAt: Timestamp.now(),
              changedBy: currentUser?.id ?? "",
            },
          ];
        }

        await updateEmployee(employee.id, updates);
        await addAuditLog(
          "employee_updated",
          currentUser?.id ?? "",
          `${currentUser?.firstName} ${currentUser?.lastName}`,
          `แก้ไขข้อมูลพนักงาน ${data.firstName} ${data.lastName}`,
          employee.id,
          `${data.firstName} ${data.lastName}`
        );
      } else {
        await createEmployee({
          ...data,
          lineUserId: null,
          lineProfilePic: null,
          isActive: true,
          resignationDate: null,
          resignationReason: null,
          nameHistory: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        await addAuditLog(
          "employee_created",
          currentUser?.id ?? "",
          `${currentUser?.firstName} ${currentUser?.lastName}`,
          `เพิ่มพนักงาน ${data.firstName} ${data.lastName}`
        );
      }
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleResign() {
    if (!employee || !resignDate) return;
    setLoading(true);
    try {
      await updateEmployee(employee.id, {
        isActive: false,
        resignationDate: Timestamp.fromDate(new Date(resignDate)),
        resignationReason: resignReason,
        updatedAt: Timestamp.now(),
      });
      await addAuditLog(
        "employee_resigned",
        currentUser?.id ?? "",
        `${currentUser?.firstName} ${currentUser?.lastName}`,
        `บันทึกลาออก: ${employee.firstName} ${employee.lastName} วันที่ ${resignDate}`,
        employee.id,
        `${employee.firstName} ${employee.lastName}`
      );
      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-sheet max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {isEdit ? "แก้ไขข้อมูล" : "เพิ่มพนักงาน"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ</label>
              <input className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล</label>
              <input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อเล่น</label>
              <input className="input" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">เลขสาขา</label>
              <input className="input" type="number" value={form.branchNumber} onChange={(e) => set("branchNumber", e.target.value)} required />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.isHR} onChange={(e) => set("isHR", e.target.checked)} className="rounded" />
              เป็น HR
            </label>
            {form.isHR && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.isHRAdmin} onChange={(e) => set("isHRAdmin", e.target.checked)} className="rounded" />
                HR Admin
              </label>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-1.5" disabled={loading}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> บันทึก...</>
              ) : (
                <><Check size={14} /> บันทึก</>
              )}
            </button>
          </div>
        </form>

        {/* Resign section */}
        {isEdit && employee?.isActive && (
          <div className="px-5 pb-5 border-t border-gray-100 mt-1 pt-4 space-y-3">
            {!showResign ? (
              <button
                onClick={() => setShowResign(true)}
                className="w-full py-2.5 px-4 text-sm font-semibold text-red-600 border-2 border-red-100 rounded-xl hover:bg-red-50 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <UserX size={16} /> บันทึกลาออก
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-100">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <UserX size={15} /> บันทึกลาออก
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันที่ลาออก</label>
                  <input type="date" className="input" value={resignDate} onChange={(e) => setResignDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เหตุผล (ถ้ามี)</label>
                  <input className="input" value={resignReason} onChange={(e) => setResignReason(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowResign(false)} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
                  <button
                    onClick={handleResign}
                    disabled={!resignDate || loading}
                    className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> บันทึก...</>
                    ) : (
                      <><UserX size={14} /> ยืนยันลาออก</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
