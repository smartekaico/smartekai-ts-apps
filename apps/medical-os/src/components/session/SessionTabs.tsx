"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, Calendar } from "lucide-react";
import type { ReactNode } from "react";

export type TabId = "chat" | "soap" | "events";

interface TabContent {
  chat: ReactNode;
  soap: ReactNode;
  events: ReactNode;
}

interface SessionTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  content: TabContent;
}

const TAB_CONFIG = {
  chat: {
    id: "chat" as TabId,
    label: "Clinical Assistant",
    icon: MessageSquare,
    activeClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 border-transparent",
    inactiveClass: "text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200",
  },
  soap: {
    id: "soap" as TabId,
    label: "SOAP Note",
    icon: FileText,
    activeClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 border-transparent",
    inactiveClass: "text-emerald-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200",
  },
  events: {
    id: "events" as TabId,
    label: "Events",
    icon: Calendar,
    activeClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 border-transparent",
    inactiveClass: "text-amber-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200",
  },
};

export function SessionTabs({ activeTab, onTabChange, content }: SessionTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Switcher - Scrollable on Mobile */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-white overflow-x-auto scrollbar-hide flex-nowrap shrink-0">
        {Object.values(TAB_CONFIG).map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <div key={tab.id} className="flex items-center gap-2">
              {index > 0 && (
                <div className="w-px h-5 bg-slate-200 shrink-0" />
              )}
              <Button
                onClick={() => onTabChange(tab.id)}
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "rounded-xl gap-2 font-bold text-xs uppercase tracking-wider h-10 px-5 transition-all shadow-sm shrink-0 whitespace-nowrap",
                  isActive ? tab.activeClass : tab.inactiveClass
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Tab Content - Persistent Mount with Absolute Positioning */}
      <div className="flex-1 relative overflow-hidden">
        {/* Chat Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300 overflow-y-auto",
            activeTab !== "chat"
              ? "opacity-0 invisible pointer-events-none"
              : "opacity-100 visible"
          )}
        >
          {content.chat}
        </div>

        {/* SOAP Note Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300 overflow-y-auto",
            activeTab !== "soap"
              ? "opacity-0 invisible pointer-events-none"
              : "opacity-100 visible"
          )}
        >
          {content.soap}
        </div>

        {/* Events Tab */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300 overflow-y-auto",
            activeTab !== "events"
              ? "opacity-0 invisible pointer-events-none"
              : "opacity-100 visible"
          )}
        >
          {content.events}
        </div>
      </div>
    </div>
  );
}
