"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Home, CalendarPlus, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/employee/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/employee/leave", label: "แจ้งลา", icon: CalendarPlus },
  { href: "/employee/history", label: "ประวัติ", icon: History },
  { href: "/employee/profile", label: "โปรไฟล์", icon: User },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!user.isLinked) router.replace("/link");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {user?.pictureUrl && (
          <img
            src={user.pictureUrl}
            alt="profile"
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <div>
          <p className="text-sm font-semibold text-gray-900 leading-none">
            {user?.employee
              ? `${user.employee.firstName} ${user.employee.lastName}`
              : user?.displayName}
          </p>
          {user?.employee && (
            <p className="text-xs text-gray-400">
              สาขา {user.employee.branchNumber}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
                active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
