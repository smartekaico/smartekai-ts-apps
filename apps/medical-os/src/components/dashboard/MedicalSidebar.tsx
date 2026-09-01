"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Settings,
  Stethoscope,
  Mic,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const mainNav: NavItem[] = [
  {
    label: "Dashboard",
    href: "/workspace",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Sessions",
    href: "/workspace/sessions",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    label: "SOAP Notes",
    href: "/workspace/notes",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Clients",
    href: "/workspace/clients",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Appointments",
    href: "/workspace/appointments",
    icon: <Calendar className="h-5 w-5" />,
  },
];

const bottomNav: NavItem[] = [
  {
    label: "Settings",
    href: "/workspace/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export function MedicalSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/workspace") {
      return pathname === "/workspace" || pathname === "/workspace/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-e border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-slate-100">
        <Link href="/workspace" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-200">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-sm">Medical OS</h1>
            <p className="text-[10px] text-slate-500 font-medium">
              Clinical Workspace
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/workspace/sessions/new"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-colors"
          >
            <Mic className="h-4 w-4" />
            New Session
          </Link>
          <Link
            href="/workspace/clients/new"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
          >
            <Users className="h-4 w-4" />
            Add Client
          </Link>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all",
                active
                  ? "bg-rose-50 text-rose-600 font-bold shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span className={cn(active && "text-rose-500")}>{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className="ms-auto bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-slate-100">
        {bottomNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all",
                active
                  ? "bg-rose-50 text-rose-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
