import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SessionTabs } from "@/components/session/SessionTabs";
import type { TabId } from "@/components/session/SessionTabs";
import { ChatWorkspace } from "@/components/session/ChatWorkspace";
import { SoapNoteEditor } from "@/components/session/SoapNoteEditor";
import { EventsPanel } from "@/components/session/EventsPanel";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/sessions/$id")({
  component: SessionPage,
});

interface SessionData {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  caseNumber: string;
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
  notesCount: number;
  eventsCount: number;
}

// Mock session data for demo
const mockSession: SessionData = {
  id: "",
  title: "Patient Consultation",
  clientName: "Ahmed Hassan",
  clientId: "client-001",
  caseNumber: "MC-2024-0042",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notesCount: 0,
  eventsCount: 0,
};

function SessionPage() {
  const navigate = useNavigate();
  const { id: sessionId } = Route.useParams();

  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Simulate fetching session data
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // In production, fetch from /api/medical/sessions/${sessionId}
        // For now, use mock data
        setSessionData({
          ...mockSession,
          id: sessionId,
        });
      } catch (err) {
        setError("Failed to load session. Please try again.");
        console.error("Session fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleBack = () => {
    navigate({ to: "/workspace" });
  };

  const handleTranscriptionComplete = (transcription: string) => {
    // Switch to SOAP tab and pass transcription
    setActiveTab("soap");
    // The SoapNoteEditor will receive this via a callback or state
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "archived":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header Skeleton */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-md">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Session Load Error
                </h3>
                <p className="text-sm text-slate-600">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <Loader2 className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <h3 className="font-bold text-lg">Session Not Found</h3>
            <Button onClick={handleBack} variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        {/* Top Row: Back Button + Title + Status */}
        <div className="flex items-center gap-4 p-4">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {sessionData.title}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider shrink-0",
                  getStatusColor(sessionData.status),
                )}
              >
                {sessionData.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{sessionData.clientName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-mono">{sessionData.caseNumber}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              className="shrink-0"
            />
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-6 px-4 pb-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Created {formatDate(sessionData.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{sessionData.notesCount} Notes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{sessionData.eventsCount} Events</span>
          </div>
        </div>
      </div>

      {/* 3-Tab Interface */}
      <div className="flex-1 overflow-hidden">
        <SessionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          content={{
            chat: (
              <ChatWorkspace
                sessionId={sessionId}
                organizationId={sessionData.clientId}
              />
            ),
            soap: (
              <SoapNoteEditor
                sessionId={sessionId}
                onSave={(soapNote) => {
                  console.log("SOAP Note saved:", soapNote);
                }}
              />
            ),
            events: <EventsPanel sessionId={sessionId} />,
          }}
        />
      </div>
    </div>
  );
}
