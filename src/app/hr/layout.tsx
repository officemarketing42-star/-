"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarDays,
  BarChart3,
  Settings,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/hr/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/hr/employees", label: "พนักงาน", icon: Users },
  { href: "/hr/overview", label: "วันลาทุกคน", icon: BarChart3 },
  { href: "/hr/leave-approvals", label: "อนุมัติลา", icon: ClipboardCheck },
  { href: "/hr/leave-settings", label: "ปรับวันลา", icon: Settings },
  { href: "/hr/pay-periods", label: "รอบตัด", icon: CalendarDays },
  { href: "/hr/reports", label: "รายงาน", icon: ScrollText },
  { href: "/hr/audit-log", label: "ประวัติแก้ไข", icon: ScrollText },
];

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user?.isHR) router.replace("/employee/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — แสดงตลอด */}
      <aside className="w-48 shrink-0 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
        {/* Logo / User */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wide">HR Panel</p>
          <div className="flex items-center gap-2 mt-2">
            {user?.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt="profile"
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs">
                👤
              </div>
            )}
            <p className="text-xs text-gray-600 truncate">
              {user?.employee?.firstName} {user?.employee?.nickname && `(${user.employee.nickname})`}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-green-50 text-green-700 font-semibold border-r-2 border-green-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
