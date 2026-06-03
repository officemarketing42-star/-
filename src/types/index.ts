import { Timestamp } from "firebase/firestore";

// ─── Employee ───────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  branchNumber: number;
  lineUserId: string | null;
  lineProfilePic: string | null;
  isHR: boolean;
  isHRAdmin: boolean;
  isActive: boolean;
  resignationDate: Timestamp | null;
  resignationReason: string | null;
  nameHistory: NameHistoryEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NameHistoryEntry {
  oldFirstName: string;
  oldLastName: string;
  newFirstName: string;
  newLastName: string;
  changedAt: Timestamp;
  changedBy: string;
}

// ─── Leave Types ─────────────────────────────────────────────────────────────

export type LeaveTypeCode =
  | "SICK"
  | "MATERNITY"
  | "PERSONAL"
  | "PUBLIC_HOLIDAY"
  | "WEEKLY_OFF"
  | "UNPAID";

export interface LeaveType {
  id: string;
  code: LeaveTypeCode;
  name: string;
  requiresApproval: boolean;
  isCarryOver: boolean;
  order: number;
}

// ─── Leave Request ───────────────────────────────────────────────────────────

export type LeaveStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "recorded";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeCode: LeaveTypeCode;
  leaveTypeName: string;
  dates: string[];
  totalDays: number;
  status: LeaveStatus;
  isUnpaid: boolean;
  payPeriodId: string | null;
  note: string;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  rejectedReason: string | null;
  submittedByHR: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Leave Balance ────────────────────────────────────────────────────────────

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  year: number;
  month: number;
  initialQuota: number;
  adjustment: number;
  carriedOver: number;
  used: number;
  remaining: number;
  updatedAt: Timestamp;
}

// ─── Leave Adjustment ────────────────────────────────────────────────────────

export interface LeaveAdjustment {
  id: string;
  employeeId: string;
  leaveTypeCode: LeaveTypeCode;
  days: number;
  reason: string;
  addedBy: string;
  year: number;
  month: number;
  createdAt: Timestamp;
}

// ─── Public Holiday ──────────────────────────────────────────────────────────

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  year: number;
  addedBy: string;
  createdAt: Timestamp;
}

// ─── Pay Period ──────────────────────────────────────────────────────────────

export type PayPeriodStatus = "open" | "closed";

export interface PayPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  sundayDates: string[];
  sundayCount: number;
  status: PayPeriodStatus;
  createdBy: string;
  createdAt: Timestamp;
  closedAt: Timestamp | null;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | "employee_created"
  | "employee_updated"
  | "employee_resigned"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "leave_adjustment"
  | "quota_updated"
  | "public_holiday_added"
  | "pay_period_created"
  | "pay_period_closed"
  | "year_closed";

export interface AuditLog {
  id: string;
  action: AuditAction;
  performedBy: string;
  performedByName: string;
  targetId: string | null;
  targetName: string | null;
  detail: string;
  createdAt: Timestamp;
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthUser {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  employee: Employee | null;
  isLinked: boolean;
  isHR: boolean;
  isHRAdmin: boolean;
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

export interface LeaveBalanceSummary {
  leaveTypeCode: LeaveTypeCode;
  leaveTypeName: string;
  remaining: number;
  used: number;
  total: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveTypeCode, string> = {
  SICK: "ลาป่วย",
  MATERNITY: "ลาคลอด",
  PERSONAL: "ลากิจ",
  PUBLIC_HOLIDAY: "วันนักขัตฤกษ์",
  WEEKLY_OFF: "วันหยุดอาทิตย์",
  UNPAID: "หักฐานเงินเดือน",
};

export const LEAVE_TYPE_COLORS: Record<LeaveTypeCode, string> = {
  SICK: "bg-red-100 text-red-700",
  MATERNITY: "bg-pink-100 text-pink-700",
  PERSONAL: "bg-blue-100 text-blue-700",
  PUBLIC_HOLIDAY: "bg-purple-100 text-purple-700",
  WEEKLY_OFF: "bg-green-100 text-green-700",
  UNPAID: "bg-gray-100 text-gray-700",
};
