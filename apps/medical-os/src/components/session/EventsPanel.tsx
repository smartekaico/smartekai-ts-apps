"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Plus,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Bell,
  Video,
  Phone,
  MapPin,
  Search,
  Filter,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number; // minutes
  clientName?: string;
  clientId?: string;
  type: "appointment" | "follow-up" | "reminder" | "meeting";
  status: "scheduled" | "completed" | "cancelled";
  location?: string;
  notes?: string;
  isVideoCall?: boolean;
  isPhoneCall?: boolean;
}

interface EventsPanelProps {
  sessionId: string;
  onEventClick?: (event: Event) => void;
  onCreateEvent?: () => void;
  className?: string;
}

const eventTypeConfig = {
  appointment: {
    label: "Appointment",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  "follow-up": {
    label: "Follow-up",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  reminder: {
    label: "Reminder",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  meeting: {
    label: "Meeting",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Initial Patient Consultation",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    duration: 60,
    clientName: "John Smith",
    type: "appointment",
    status: "scheduled",
    location: "Room 101",
    isVideoCall: false,
  },
  {
    id: "2",
    title: "Follow-up Review",
    date: new Date().toISOString().split("T")[0],
    time: "11:30",
    duration: 30,
    clientName: "Sarah Johnson",
    type: "follow-up",
    status: "scheduled",
    isVideoCall: true,
  },
  {
    id: "3",
    title: "Lab Results Review",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "14:00",
    duration: 15,
    clientName: "Mike Davis",
    type: "reminder",
    status: "scheduled",
  },
];

export function EventsPanel({
  sessionId,
  onEventClick,
  onCreateEvent,
  className,
}: EventsPanelProps) {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    duration: 30,
    type: "appointment",
    status: "scheduled",
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const hasEventsOnDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.some((e) => e.date === dateStr);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => e.date === dateStr);
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || event.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : filteredEvents;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date) return;

    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title || "",
      date: newEvent.date || "",
      time: newEvent.time || "09:00",
      duration: newEvent.duration || 30,
      clientName: newEvent.clientName,
      clientId: newEvent.clientId,
      type: newEvent.type as Event["type"],
      status: "scheduled",
      location: newEvent.location,
      notes: newEvent.notes,
      isVideoCall: newEvent.isVideoCall,
      isPhoneCall: newEvent.isPhoneCall,
    };

    setEvents((prev) => [...prev, event]);
    setIsCreating(false);
    setNewEvent({
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      duration: 30,
      type: "appointment",
      status: "scheduled",
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const days = getDaysInMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn("flex flex-col h-full bg-slate-50", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-400" />
            Events & Appointments
          </h2>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Event
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 h-9 rounded-lg bg-slate-50 border-slate-200"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">All Types</option>
            <option value="appointment">Appointments</option>
            <option value="follow-up">Follow-ups</option>
            <option value="reminder">Reminders</option>
            <option value="meeting">Meetings</option>
          </select>
        </div>
      </div>

      {/* Calendar and Events List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Calendar */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">
                  {monthYear}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-slate-400 uppercase py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const hasEvents = hasEventsOnDate(date);
                  const isSelected =
                    selectedDate &&
                    date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth();
                  const today = isToday(date);

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                        today && "bg-rose-100 text-rose-600 font-bold",
                        isSelected && !today && "bg-slate-100",
                        !today && !isSelected && "hover:bg-slate-50"
                      )}
                    >
                      <span>{date.getDate()}</span>
                      {hasEvents && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-rose-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">
                {selectedDate
                  ? formatDate(selectedDate)
                  : "All Events"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No events found</p>
                  <Button
                    variant="link"
                    onClick={() => setIsCreating(true)}
                    className="text-rose-600"
                  >
                    Create an event
                  </Button>
                </div>
              ) : (
                selectedDateEvents
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((event) => {
                    const typeConfig = eventTypeConfig[event.type];
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer",
                          typeConfig.bg,
                          typeConfig.border
                        )}
                        onClick={() => onEventClick?.(event)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900 truncate">
                                {event.title}
                              </h4>
                              {event.isVideoCall && (
                                <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              )}
                              {event.isPhoneCall && (
                                <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.time}
                                <span className="text-slate-400">
                                  ({event.duration}m)
                                </span>
                              </span>
                              {event.clientName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {event.clientName}
                                </span>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                typeConfig.bg,
                                typeConfig.color
                              )}
                            >
                              {typeConfig.label}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Event Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-black">
                New Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Title
                </label>
                <Input
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Event title..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Duration (minutes)
                </label>
                <select
                  value={newEvent.duration}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value),
                    }))
                  }
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      type: e.target.value as Event["type"],
                    }))
                  }
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                >
                  <option value="appointment">Appointment</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="reminder">Reminder</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Location
                </label>
                <Input
                  value={newEvent.location || ""}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Room, office, or address..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.isVideoCall}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        isVideoCall: e.target.checked,
                        isPhoneCall: e.target.checked ? false : prev.isPhoneCall,
                      }))
                    }
                    className="rounded border-slate-300"
                  />
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Video Call</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.isPhoneCall}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        isPhoneCall: e.target.checked,
                        isVideoCall: e.target.checked
                          ? false
                          : prev.isVideoCall,
                      }))
                    }
                    className="rounded border-slate-300"
                  />
                  <Phone className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Phone Call</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={!newEvent.title}
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                >
                  Create Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
