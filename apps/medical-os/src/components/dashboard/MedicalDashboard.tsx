"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Users,
  FileText,
  Calendar,
  Plus,
  Search,
  Clock,
  MoreVertical,
  ArrowRight,
  Activity,
  Stethoscope,
} from "lucide-react";

interface StatCard {
  name: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  href?: string;
}

interface RecentSession {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  updatedAt: string;
  status: "open" | "archived";
  noteCount: number;
}

const mockStats: StatCard[] = [
  {
    name: "Total Clients",
    value: 0,
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    name: "Total Sessions",
    value: 0,
    icon: Activity,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    name: "SOAP Notes",
    value: 0,
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-100",
    href: "/workspace/notes",
  },
];

const mockSessions: RecentSession[] = [];

export function MedicalDashboard() {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const stats = mockStats;
  const sessions = mockSessions;

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F6F9] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Medical Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              AI-powered clinical documentation
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const card = (
              <Card
                className={cn(
                  "border-slate-100",
                  stat.href &&
                    "hover:shadow-md transition-all duration-200 cursor-pointer",
                )}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {stat.name}
                      </p>
                      <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={cn("p-3 rounded-2xl", stat.bg)}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return stat.href ? (
              <a key={stat.name} href={stat.href}>
                {card}
              </a>
            ) : (
              <div key={stat.name}>{card}</div>
            );
          })}
        </div>

        {/* Recent Sessions */}
        <Card className="border-slate-100">
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Recent Sessions
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {filteredSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Stethoscope className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  {searchQuery
                    ? `No sessions matching "${searchQuery}"`
                    : "No sessions yet"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first session to get started"}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <a
                  key={session.id}
                  href={`/workspace/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {session.title || "Untitled Session"}
                      </h3>
                      {session.status === "archived" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {session.clientName || "No client"}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(session.updatedAt)}
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {session.noteCount} notes
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              ))
            )}
          </div>

          {sessions.length > 0 && (
            <div className="p-4 border-t border-slate-100 text-center">
              <a href="#sessions">
                <Button variant="link" className="text-indigo-600 font-bold">
                  View all sessions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          )}
        </Card>

        {/* FAB - Floating Action Button */}
        <div className="fixed bottom-6 end-6 z-50">
          <div className="relative">
            {/* FAB Menu */}
            <div
              className={cn(
                "absolute bottom-16 end-0 mb-2 flex flex-col gap-2 transition-all duration-300 origin-bottom-right",
                isFabOpen
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-4 scale-95 pointer-events-none"
              )}
            >
              <a href="/workspace/sessions/new">
                <Button
                  size="lg"
                  className="rounded-2xl gap-2 shadow-xl bg-emerald-600 hover:bg-emerald-700"
                >
                  <Activity className="h-5 w-5" />
                  <span className="hidden sm:inline">New Session</span>
                </Button>
              </a>
            </div>

            {/* FAB Toggle */}
            <Button
              onClick={() => setIsFabOpen(!isFabOpen)}
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
                isFabOpen
                  ? "bg-slate-900 hover:bg-slate-800 rotate-45"
                  : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              <Plus
                className={cn(
                  "h-6 w-6 transition-transform duration-300",
                  isFabOpen && "rotate-45"
                )}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
