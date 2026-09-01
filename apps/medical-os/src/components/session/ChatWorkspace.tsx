"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Send,
  Loader2,
  User,
  Bot,
  Mic,
  FileText,
  Pill,
  Activity,
  Heart,
  Brain,
  Stethoscope,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    id: "diagnosis",
    label: "Differential Diagnosis",
    icon: Brain,
    prompt: "Provide differential diagnosis based on symptoms",
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
  },
  {
    id: "medication",
    label: "Medication Review",
    icon: Pill,
    prompt: "Review medications for interactions and appropriateness",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  {
    id: "vitals",
    label: "Vitals Analysis",
    icon: Activity,
    prompt: "Analyze patient vital signs and trends",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 hover:bg-emerald-100",
  },
  {
    id: "cardiac",
    label: "Cardiac Assessment",
    icon: Heart,
    prompt: "Perform cardiac risk assessment and recommendations",
    color: "text-rose-600",
    bgColor: "bg-rose-50 hover:bg-rose-100",
  },
  {
    id: "exam",
    label: "Physical Exam Guide",
    icon: Stethoscope,
    prompt: "Provide physical examination checklist",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100",
  },
  {
    id: "soap",
    label: "SOAP Template",
    icon: FileText,
    prompt: "Generate SOAP note structure for this encounter",
    color: "text-amber-600",
    bgColor: "bg-amber-50 hover:bg-amber-100",
  },
];

interface ChatWorkspaceProps {
  sessionId: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  organizationId?: string;
  onRefresh?: () => void;
  className?: string;
}

export function ChatWorkspace({
  sessionId,
  user,
  organizationId,
  onRefresh,
  className,
}: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your clinical AI assistant. How can I help you today?\n\nI can assist with:\n• Differential diagnosis\n• Medication review\n• Vitals analysis\n• Clinical documentation\n\nSelect a quick action below or type your question.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Add loading message
    const loadingMessage: Message = {
      id: `${Date.now()}-loading`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await fetch("/api/medical/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          organizationId,
          history: messages
            .filter((m) => m.role === "user")
            .map((m) => m.content),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessage.id
            ? {
                ...m,
                id: `${Date.now()}-assistant`,
                content: data.response || data.message || data.content || "I apologize, but I couldn't process that request. Please try again.",
              }
            : m
        )
      );
    } catch (err) {
      // Replace loading message with error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessage.id
            ? {
                ...m,
                id: `${Date.now()}-error`,
                content: "I'm sorry, I encountered an error processing your request. Please try again.",
                isError: true,
              }
            : m
        )
      );
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Quick Actions Bar */}
      <div className="flex-shrink-0 border-b border-slate-100 p-3 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Quick Actions
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                action.bgColor,
                isLoading && "opacity-50"
              )}
            >
              <action.icon className={cn("h-5 w-5", action.color)} />
              <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollAreaRef as any}>
        <div className="p-4 space-y-4 min-h-full">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "user"
                    ? "bg-rose-100 text-rose-600"
                    : message.isError
                      ? "bg-red-100 text-red-600"
                      : "bg-indigo-100 text-indigo-600"
                )}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : message.isError ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={cn(
                  "flex-1 max-w-[85%] space-y-2",
                  message.role === "user" && "items-end"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-md"
                      : message.isError
                        ? "bg-red-50 text-red-700 rounded-tl-md border border-red-100"
                        : "bg-slate-100 text-slate-800 rounded-tl-md"
                  )}
                >
                  {message.id.endsWith("-loading") ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )}
                </div>

                {/* Message Footer */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-1",
                    message.role === "user" && "justify-end"
                  )}
                >
                  <span className="text-[10px] text-slate-400">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === "assistant" && !message.isError && (
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-slate-200 p-4 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your clinical question..."
              disabled={isLoading}
              className="pr-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            size="lg"
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          AI assistant for clinical support. Always verify critical information.
        </p>
      </div>
    </div>
  );
}
