"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getEmployeeByNameAndBranch,
  linkLineToEmployee,
} from "@/lib/firestore";

export default function LinkPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branchNumber, setBranchNumber] = useState("");
  const [branchError, setBranchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleBranchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === "") {
      setBranchNumber("");
      setBranchError("");
      return;
    }
    if (!/^\d+$/.test(val)) {
      setBranchError("กรุณากรอกเฉพาะตัวเลขเท่านั้น");
    } else {
      setBranchError("");
      setBranchNumber(val);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || branchError) return;
    setError("");
    setLoading(true);

    try {
      const employee = await getEmployeeByNameAndBranch(
        firstName.trim(),
        lastName.trim(),
        Number(branchNumber)
      );

      if (!employee) {
        setError("ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบชื่อและเลขสาขา หรือติดต่อ HR");
        return;
      }

      if (employee.lineUserId && employee.lineUserId !== user.lineUserId) {
        setError("บัญชีนี้ถูกผูกกับ LINE อื่นไว้แล้ว กรุณาติดต่อ HR");
        return;
      }

      await linkLineToEmployee(employee.id, user.lineUserId, user.pictureUrl);
      await refresh();

      if (employee.isHR) {
        router.replace("/hr/dashboard");
      } else {
        router.replace("/employee/dashboard");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900">ยืนยันตัวตน</h1>
          <p className="text-sm text-gray-500 mt-1">
            กรอกข้อมูลเพื่อผูกบัญชี LINE ของคุณ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ
            </label>
            <input
              className="input"
              placeholder="ชื่อจริง (ไม่ต้องใส่คำนำหน้า เช่น นาย/นาง)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              นามสกุล
            </label>
            <input
              className="input"
              placeholder="นามสกุล"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              เลขสาขา
            </label>
            <input
              className={`input ${branchError ? "border-red-400 focus:ring-red-400" : ""}`}
              placeholder="เช่น 1"
              inputMode="numeric"
              value={branchNumber}
              onChange={handleBranchChange}
              required
            />
            {branchError && (
              <p className="text-xs text-red-500 mt-1">{branchError}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !!branchError || !branchNumber}
          >
            {loading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          หากพบปัญหา กรุณาติดต่อ HR
        </p>
      </div>
    </div>
  );
}
