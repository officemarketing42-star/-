import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Employee,
  LeaveRequest,
  LeaveBalance,
  LeaveAdjustment,
  PublicHoliday,
  PayPeriod,
  AuditLog,
  AuditAction,
  LeaveTypeCode,
} from "@/types";
import { balanceId, getCurrentYearMonth } from "./utils";

// ─── Collections ─────────────────────────────────────────────────────────────

const COL = {
  employees: "employees",
  leaveTypes: "leaveTypes",
  leaveRequests: "leaveRequests",
  leaveBalances: "leaveBalances",
  leaveAdjustments: "leaveAdjustments",
  publicHolidays: "publicHolidays",
  payPeriods: "payPeriods",
  auditLogs: "auditLogs",
};

// ─── Employee ─────────────────────────────────────────────────────────────────

export async function getEmployeeByLineId(lineUserId: string): Promise<Employee | null> {
  const q = query(
    collection(db, COL.employees),
    where("lineUserId", "==", lineUserId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Employee;
}

export async function getEmployeeByNameAndBranch(
  firstName: string,
  lastName: string,
  branchNumber: number
): Promise<Employee | null> {
  const q = query(
    collection(db, COL.employees),
    where("firstName", "==", firstName),
    where("lastName", "==", lastName),
    where("branchNumber", "==", branchNumber),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Employee;
}

export async function linkLineToEmployee(
  employeeId: string,
  lineUserId: string,
  lineProfilePic: string
): Promise<void> {
  await updateDoc(doc(db, COL.employees, employeeId), {
    lineUserId,
    lineProfilePic,
    updatedAt: Timestamp.now(),
  });
}

export async function getAllEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, COL.employees));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Employee)
    .sort((a, b) => a.branchNumber - b.branchNumber);
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const snap = await getDocs(collection(db, COL.employees));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Employee)
    .filter((e) => e.isActive)
    .sort((a, b) => a.branchNumber - b.branchNumber);
}

export async function createEmployee(data: Omit<Employee, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COL.employees), data);
  return ref.id;
}

export async function batchCreateEmployees(
  employees: Omit<Employee, "id">[]
): Promise<void> {
  const CHUNK = 499;
  for (let i = 0; i < employees.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const emp of employees.slice(i, i + CHUNK)) {
      const ref = doc(collection(db, COL.employees));
      batch.set(ref, { ...emp, id: ref.id });
    }
    await batch.commit();
  }
}

export async function updateEmployee(
  id: string,
  data: Partial<Employee>
): Promise<void> {
  await updateDoc(doc(db, COL.employees, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function createLeaveRequest(
  data: Omit<LeaveRequest, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COL.leaveRequests), data);

  // Deduct balance immediately for auto-approved types (not SICK, not UNPAID)
  if (data.status === "recorded" && !data.isUnpaid && data.dates.length > 0) {
    const d = new Date(data.dates[0] + "T00:00:00");
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const bid = balanceId(data.employeeId, data.leaveTypeCode, year, month);
    const balRef = doc(db, COL.leaveBalances, bid);
    const balSnap = await getDoc(balRef);
    if (balSnap.exists()) {
      await updateDoc(balRef, {
        used: increment(data.totalDays),
        remaining: increment(-data.totalDays),
        updatedAt: Timestamp.now(),
      });
    }
  }

  return ref.id;
}

export async function getLeaveRequestsByEmployee(
  employeeId: string
): Promise<LeaveRequest[]> {
  const q = query(
    collection(db, COL.leaveRequests),
    where("employeeId", "==", employeeId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as LeaveRequest)
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
}

export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  const q = query(
    collection(db, COL.leaveRequests),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as LeaveRequest)
    .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
}

export async function getLeaveRequestsByDate(date: string): Promise<LeaveRequest[]> {
  const q = query(
    collection(db, COL.leaveRequests),
    where("dates", "array-contains", date)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as LeaveRequest)
    .filter((r) => r.status !== "rejected");
}

export async function updateLeaveRequestStatus(
  id: string,
  status: "approved" | "rejected",
  approvedBy: string,
  rejectedReason?: string,
  leaveData?: { employeeId: string; leaveTypeCode: LeaveTypeCode; totalDays: number; dates: string[] }
): Promise<void> {
  await updateDoc(doc(db, COL.leaveRequests, id), {
    status,
    approvedBy: status === "approved" ? approvedBy : null,
    approvedAt: status === "approved" ? Timestamp.now() : null,
    rejectedReason: rejectedReason ?? null,
    updatedAt: Timestamp.now(),
  });

  // Deduct balance when SICK leave is approved
  if (status === "approved" && leaveData && leaveData.dates.length > 0) {
    const d = new Date(leaveData.dates[0] + "T00:00:00");
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const bid = balanceId(leaveData.employeeId, leaveData.leaveTypeCode, year, month);
    const balRef = doc(db, COL.leaveBalances, bid);
    const balSnap = await getDoc(balRef);
    if (balSnap.exists()) {
      await updateDoc(balRef, {
        used: increment(leaveData.totalDays),
        remaining: increment(-leaveData.totalDays),
        updatedAt: Timestamp.now(),
      });
    }
  }
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export async function getLeaveBalance(
  employeeId: string,
  leaveTypeCode: LeaveTypeCode,
  year: number,
  month: number
): Promise<LeaveBalance | null> {
  const id = balanceId(employeeId, leaveTypeCode, year, month);
  const snap = await getDoc(doc(db, COL.leaveBalances, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LeaveBalance;
}

export async function getLeaveBalancesByEmployee(
  employeeId: string,
  year: number,
  month: number
): Promise<LeaveBalance[]> {
  const q = query(
    collection(db, COL.leaveBalances),
    where("employeeId", "==", employeeId),
    where("year", "==", year),
    where("month", "==", month)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LeaveBalance);
}

export async function upsertLeaveBalance(balance: LeaveBalance): Promise<void> {
  const id = balanceId(
    balance.employeeId,
    balance.leaveTypeCode,
    balance.year,
    balance.month
  );
  await setDoc(doc(db, COL.leaveBalances, id), {
    ...balance,
    id,
    updatedAt: Timestamp.now(),
  });
}

export async function createWeeklyOffBalancesForPeriod(
  payPeriodId: string,
  sundayCount: number,
  startDate: string
): Promise<void> {
  const employees = await getActiveEmployees();
  const d = new Date(startDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const batch = writeBatch(db);
  for (const emp of employees) {
    const id = `${emp.id}_WEEKLY_OFF_${payPeriodId}`;
    batch.set(doc(db, COL.leaveBalances, id), {
      id,
      employeeId: emp.id,
      leaveTypeCode: "WEEKLY_OFF",
      year,
      month,
      payPeriodId,
      initialQuota: sundayCount,
      adjustment: 0,
      carriedOver: 0,
      used: 0,
      remaining: sundayCount,
      updatedAt: Timestamp.now(),
    });
  }
  await batch.commit();
}

export async function getWeeklyOffBalanceByPeriod(
  employeeId: string,
  payPeriodId: string
): Promise<LeaveBalance | null> {
  const id = `${employeeId}_WEEKLY_OFF_${payPeriodId}`;
  const snap = await getDoc(doc(db, COL.leaveBalances, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as LeaveBalance;
}

export async function getWeeklyOffSummaryByPeriod(
  payPeriodId: string
): Promise<LeaveBalance[]> {
  const q = query(
    collection(db, COL.leaveBalances),
    where("payPeriodId", "==", payPeriodId),
    where("leaveTypeCode", "==", "WEEKLY_OFF")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LeaveBalance);
}

// ─── Leave Adjustments ────────────────────────────────────────────────────────

export async function createLeaveAdjustment(
  data: Omit<LeaveAdjustment, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COL.leaveAdjustments), data);

  const bid = balanceId(data.employeeId, data.leaveTypeCode, data.year, data.month);
  const balRef = doc(db, COL.leaveBalances, bid);
  const balSnap = await getDoc(balRef);

  if (balSnap.exists()) {
    await updateDoc(balRef, {
      adjustment: increment(data.days),
      remaining: increment(data.days),
      updatedAt: Timestamp.now(),
    });
  } else {
    await setDoc(balRef, {
      id: bid,
      employeeId: data.employeeId,
      leaveTypeCode: data.leaveTypeCode,
      year: data.year,
      month: data.month,
      payPeriodId: null,
      initialQuota: 0,
      adjustment: data.days,
      carriedOver: 0,
      used: 0,
      remaining: data.days,
      updatedAt: Timestamp.now(),
    });
  }

  return ref.id;
}

// ─── Public Holidays ──────────────────────────────────────────────────────────

export async function getPublicHolidaysByYear(year: number): Promise<PublicHoliday[]> {
  const q = query(
    collection(db, COL.publicHolidays),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as PublicHoliday)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function createPublicHoliday(
  data: Omit<PublicHoliday, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COL.publicHolidays), data);
  return ref.id;
}

// ─── Pay Periods ──────────────────────────────────────────────────────────────

export async function getAllPayPeriods(): Promise<PayPeriod[]> {
  const snap = await getDocs(collection(db, COL.payPeriods));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as PayPeriod)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function createPayPeriod(
  data: Omit<PayPeriod, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COL.payPeriods), data);
  return ref.id;
}

export async function closePayPeriod(id: string): Promise<void> {
  await updateDoc(doc(db, COL.payPeriods, id), {
    status: "closed",
    closedAt: Timestamp.now(),
  });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function addAuditLog(
  action: AuditAction,
  performedBy: string,
  performedByName: string,
  detail: string,
  targetId?: string,
  targetName?: string
): Promise<void> {
  await addDoc(collection(db, COL.auditLogs), {
    action,
    performedBy,
    performedByName,
    targetId: targetId ?? null,
    targetName: targetName ?? null,
    detail,
    createdAt: Timestamp.now(),
  });
}

export async function getAuditLogs(limitCount = 100): Promise<AuditLog[]> {
  const snap = await getDocs(collection(db, COL.auditLogs));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as AuditLog)
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
    .slice(0, limitCount);
}
