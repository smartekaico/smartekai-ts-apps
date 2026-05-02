"use client";

import type * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Plus,
	Loader2,
	Calendar as CalendarIcon,
	Scale,
	Gavel,
	Timer,
	MapPin,
	User,
	Clock,
	Bell,
	BellOff,
	CheckCircle2,
	AlertCircle,
	FileText,
	UserCheck,
	Building2,
	Hash,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ClientOnly } from "@/components/global/ClientOnly";

type Project = {
	id: string;
	title: string;
};

type TeamMember = {
	id: string;
	name: string;
	email: string;
	image?: string;
	role: string;
};

const EVENT_TYPES = [
	{
		value: "Hearing",
		label: "جلسة محكمة",
		icon: Gavel,
		color: "text-red-500",
		bgColor: "bg-red-50",
	},
	{
		value: "Expert",
		label: "إدارة الخبراء",
		icon: Scale,
		color: "text-amber-500",
		bgColor: "bg-amber-50",
	},
	{
		value: "Deadline",
		label: "موعد نهائي",
		icon: Timer,
		color: "text-rose-500",
		bgColor: "bg-rose-50",
	},
	{
		value: "Meeting",
		label: "اجتماع عمل",
		icon: UserCheck,
		color: "text-sky-500",
		bgColor: "bg-sky-50",
	},
];

const COURT_OPTIONS = [
	"المحكمة الكلية",
	"محكمة الاستئناف",
	"محكمة التمييز",
	"المحكمة الدستورية",
	"نيابة التنفيذ الجنائي",
	"الإدارة العامة للتنفيذ",
	"إدارة الخبراء",
];

export function AddEventModal({
	trigger,
	open: externalOpen,
	onOpenChange: setExternalOpen,
	projectId: initialProjectId,
	eventData,
	onSuccess,
}: {
	trigger?: React.ReactElement;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	projectId?: string;
	eventData?: any;
	onSuccess?: () => void;
}) {
	const router = useRouter();
	const t = useTranslations("Dashboard");
	const locale = useLocale();
	const { data: session } = authClient.useSession();

	const [internalOpen, setInternalOpen] = useState(false);
	const open = externalOpen !== undefined ? externalOpen : internalOpen;
	const setOpen =
		setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;

	const [loading, setLoading] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);
	const [loadingProjects, setLoadingProjects] = useState(false);

	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [loadingMembers, setLoadingMembers] = useState(false);

	// Form state
	const [sessionId, setSessionId] = useState(initialProjectId || "");
	const [title, setTitle] = useState("");
	const [eventType, setEventType] = useState("Hearing");
	const [date, setDate] = useState<Date | undefined>(new Date());
	const [eventTime, setEventTime] = useState("09:00");
	const [court, setCourt] = useState("");
	const [circuit, setCircuit] = useState("");
	const [rollNumber, setRollNumber] = useState("");
	const [description, setDescription] = useState("");
	const [assignedUserId, setAssignedUserId] = useState("");
	const [reminderEnabled, setReminderEnabled] = useState(true);
	const [reminderDays, setReminderDays] = useState("1");

	const isEdit = !!eventData;

	// Sync state when the modal opens or the prop changes
	useEffect(() => {
		if (open) {
			if (eventData) {
				setSessionId(eventData.sessionId?.toString() || initialProjectId || "");
				setTitle(eventData.title || "");
				setEventType(eventData.eventType || "Hearing");
				const d = eventData.eventDate
					? new Date(eventData.eventDate)
					: new Date();
				setDate(d);
				setEventTime(format(d, "HH:mm"));
				setCourt(eventData.court || "");
				setCircuit(eventData.circuit || "");
				setRollNumber(eventData.rollNumber || "");
				setDescription(eventData.description || "");
				setAssignedUserId(eventData.assignedUserId || "");
				setReminderEnabled(eventData.reminderEnabled ?? true);
				setReminderDays(eventData.reminderDays?.toString() || "1");
			} else {
				// Reset for new event
				setSessionId(initialProjectId || "");
				setTitle("");
				setEventType("Hearing");
				setDate(new Date());
				setEventTime("09:00");
				setCourt("");
				setCircuit("");
				setRollNumber("");
				setDescription("");
				setAssignedUserId(session?.user?.id || "");
				setReminderEnabled(true);
				setReminderDays("1");
			}
		}
	}, [open, initialProjectId, eventData, session?.user?.id]);

	useEffect(() => {
		if (open && !eventData) {
			if (!initialProjectId) fetchProjects();
			fetchTeamMembers();
		} else if (open && eventData) {
			fetchTeamMembers();
		}
	}, [open, initialProjectId, eventData, session?.user?.id]);

	const fetchProjects = async () => {
		setLoadingProjects(true);
		try {
			const res = await fetch("/api/legal/sessions");
			if (res.ok) {
				const data = await res.json();
				setProjects(data);
			}
		} catch (error) {
			console.error("Failed to fetch projects", error);
		} finally {
			setLoadingProjects(false);
		}
	};

	const fetchTeamMembers = async () => {
		if (!session?.user) return;

		setLoadingMembers(true);

		// Pre-populate with current user to avoid ID blinking
		const currentUserMember: TeamMember = {
			id: session.user.id,
			name: session.user.name || (locale === "ar" ? "أنت" : "You"),
			email: session.user.email || "",
			role: "Member",
		};

		// Set initial state
		setTeamMembers([currentUserMember]);

		if (!assignedUserId) {
			setAssignedUserId(session.user.id);
		}

		try {
			const res = await fetch("/api/org/members");
			if (res.ok) {
				const data = await res.json();
				const hasCurrentUser = data.some(
					(m: TeamMember) => m.id === session.user.id,
				);
				setTeamMembers(hasCurrentUser ? data : [currentUserMember, ...data]);
			}
		} catch (error) {
			console.error("Failed to fetch team members", error);
		} finally {
			setLoadingMembers(false);
		}
	};

	const handleCreateEvent = async () => {
		if (!sessionId || !description || !date) {
			toast.error("الرجاء إكمال جميع الحقول المطلوبة (الجلسة، الوصف، التاريخ)");
			return;
		}

		// Auto-generate title from description or event type
		const derivedTitle =
			description.slice(0, 50).trim() ||
			EVENT_TYPES.find((t) => t.value === eventType)?.label ||
			"موعد جديد";

		const finalDate = new Date(date);
		const [hours, minutes] = eventTime.split(":").map(Number);
		finalDate.setHours(hours, minutes, 0, 0);

		setLoading(true);
		try {
			const url = isEdit
				? `/api/legal/events/${eventData.id}`
				: "/api/legal/events";
			const method = isEdit ? "PATCH" : "POST";

			const res = await fetch(url, {
				method: method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId: Number.parseInt(sessionId, 10),
					title: derivedTitle,
					eventType,
					eventDate: finalDate.toISOString(),
					court,
					circuit,
					rollNumber,
					description,
					assignedUserId,
					reminderEnabled,
					reminderDays: Number.parseInt(reminderDays, 10),
				}),
			});

			if (res.ok) {
				toast.success(
					isEdit ? "تم تحديث الموعد بنجاح" : "تمت إضافة الموعد بنجاح",
				);
				setOpen(false);
				if (!isEdit) {
					// Reset only if not editing
					setTitle("");
					setCourt("");
					setCircuit("");
					setRollNumber("");
					setDescription("");
				}
				router.refresh();
				if (onSuccess) onSuccess();
			} else {
				const error = await res.json();
				toast.error(
					error.error ||
						(isEdit ? "فشل في تحديث الموعد" : "فشل في إضافة الموعد"),
				);
			}
		} catch (error) {
			toast.error("حدث خطأ غير متوقع");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger} />}

			<DialogContent
				className="w-[95%] sm:max-w-[550px] md:max-w-[750px] lg:max-w-[850px] rounded-[20px] sm:rounded-[24px] p-0 overflow-hidden border-none shadow-2xl bg-white transition-all rtl mx-auto max-h-[95vh] flex flex-col"
				dir="rtl"
			>
				<div className="h-2.5 w-full bg-gradient-to-r from-red-500 via-amber-500 to-indigo-600 animate-gradient-x" />

				<div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
					<DialogHeader className="text-right space-y-1 mb-4">
						<div className="flex items-center gap-4 mb-2">
							<div className="h-9 w-9 bg-indigo-600 rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
								<CalendarIcon className="h-5 w-5" />
							</div>
							<div>
								<DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
									{isEdit ? "تعديل موعد قانوني" : "إضافة موعد قانوني"}
								</DialogTitle>
								<DialogDescription className="text-slate-500 font-medium text-[10px] sm:text-xs mt-0.5">
									جدولة الجلسات والمواعيد الهامة المرتبطة بالقضايا.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
						{/* Left Column - Type & Core Info */}
						<div className="md:col-span-7 lg:col-span-7 space-y-5">
							{/* Event Type Selection */}
							<div className="space-y-4">
								<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
									تصنيف الموعد
								</Label>
								<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
									{EVENT_TYPES.map((type) => (
										<button
											key={type.value}
											type="button"
											onClick={() => setEventType(type.value)}
											className={cn(
												"group flex flex-col items-center gap-1.5 p-2 rounded-[16px] border transition-all duration-300 text-center relative h-20 justify-center",
												eventType === type.value
													? "bg-white border-indigo-600 shadow-lg shadow-indigo-50 active-ring ring-4 ring-indigo-50"
													: "bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200",
											)}
										>
											<div
												className={cn(
													"h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
													eventType === type.value ? type.bgColor : "bg-white",
												)}
											>
												<type.icon className={cn("h-5 w-5", type.color)} />
											</div>
											<span
												className={cn(
													"text-[9px] font-black transition-colors leading-tight",
													eventType === type.value
														? "text-slate-900"
														: "text-slate-400 group-hover:text-slate-600",
												)}
											>
												{type.label}
											</span>
											{eventType === type.value && (
												<div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600" />
											)}
										</button>
									))}
								</div>
							</div>

							{/* Main Fields */}
							<div className="space-y-6">
								<div className="space-y-3">
									<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
										ملاحظات / وصف الموعد
									</Label>
									<Textarea
										placeholder="أدخل تفاصيل الموعد..."
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										className="rounded-xl min-h-[100px] bg-slate-50/50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold transition-all px-4 py-3 resize-none text-[13px]"
									/>
								</div>

								{!initialProjectId && (
									<div className="space-y-3">
										<Label
											htmlFor="session"
											className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1"
										>
											جلسة العمل المرتبطة
										</Label>
										<Select
											value={sessionId}
											onValueChange={(val) => setSessionId(val || "")}
										>
											<SelectTrigger
												id="session"
												className="rounded-xl h-10 bg-slate-50/50 border-slate-200 font-bold px-4 text-xs"
											>
												<SelectValue placeholder="اختر الجلسة..." />
											</SelectTrigger>
											<SelectContent
												className="rounded-2xl border-slate-200 shadow-xl"
												dir="rtl"
											>
												{loadingProjects ? (
													<div className="p-4 text-center">
														<Loader2 className="h-4 w-4 animate-spin text-indigo-600 inline" />
													</div>
												) : (
													projects.map((p) => (
														<SelectItem
															key={p.id}
															value={p.id.toString()}
															className="font-bold"
														>
															{p.title}
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
						</div>

						{/* Right Column - Logistics & Court Info */}
						<div className="md:col-span-5 lg:col-span-5 space-y-6 bg-slate-50/50 rounded-[24px] p-4 sm:p-5 border border-slate-100">
							<div className="space-y-6">
								{/* Court Logistics */}
								<div className="space-y-3 text-right">
									<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
										بيانات المحكمة (اختياري)
									</Label>

									<div className="space-y-4">
										<div className="relative">
											<Select
												value={court}
												onValueChange={(val) => setCourt(val || "")}
											>
												<SelectTrigger className="rounded-xl h-10 bg-white border-slate-200 font-bold ps-10 text-xs">
													<Building2 className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300" />
													<SelectValue placeholder="المحكمة المختصة..." />
												</SelectTrigger>
												<SelectContent dir="rtl">
													{COURT_OPTIONS.map((c) => (
														<SelectItem key={c} value={c}>
															{c}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<div className="grid grid-cols-2 gap-3">
											<div className="relative">
												<Input
													placeholder="الدائرة..."
													value={circuit}
													onChange={(e) => setCircuit(e.target.value)}
													className="rounded-xl h-10 bg-white border-slate-200 font-bold ps-3 text-xs"
												/>
												<Label className="absolute -top-2 right-4 bg-slate-50 text-[9px] font-black px-1 text-slate-400">
													الدائرة
												</Label>
											</div>
											<div className="relative">
												<Input
													placeholder="رقم الرول..."
													value={rollNumber}
													onChange={(e) => setRollNumber(e.target.value)}
													className="rounded-xl h-10 bg-white border-slate-200 font-bold ps-3 text-xs"
												/>
												<Label className="absolute -top-2 right-4 bg-slate-50 text-[9px] font-black px-1 text-slate-400">
													الرول
												</Label>
											</div>
										</div>
									</div>
								</div>

								{/* Date & Time */}
								<div className="space-y-3">
									<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
										التوقيت
									</Label>
									<div className="grid grid-cols-2 gap-3">
										<Popover>
											<PopoverTrigger
												render={
													<Button
														variant={"outline"}
														className={cn(
															"justify-start text-right font-bold h-10 rounded-xl bg-white border-slate-200 transition-all hover:bg-indigo-50/50 px-4 text-xs",
															!date && "text-slate-400",
														)}
													/>
												}
											>
												<CalendarIcon className="ms-2 h-4 w-4 text-slate-400" />
												<ClientOnly fallback={<span>التاريخ</span>}>
													{date ? format(date, "P", { locale: ar }) : "التاريخ"}
												</ClientOnly>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto p-0 rounded-[24px] border-none shadow-2xl"
												align="start"
											>
												<Calendar
													mode="single"
													selected={date}
													onSelect={setDate}
													initialFocus
													locale={ar}
													className="font-sans"
												/>
											</PopoverContent>
										</Popover>

										<div className="relative">
											<Input
												type="time"
												value={eventTime}
												onChange={(e) => setEventTime(e.target.value)}
												className="rounded-xl h-10 bg-white border-slate-200 font-bold px-4 font-sans text-right text-xs"
											/>
											<Clock className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300 pointer-events-none" />
										</div>
									</div>
								</div>

								{/* Assignment */}
								{/* Assignment */}
								<div className="space-y-4 pt-2">
									<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
										<User className="h-3 w-3" />
										تكليف العضو المسؤول
									</Label>
									<Select
										value={assignedUserId}
										onValueChange={(val) => setAssignedUserId(val || "")}
									>
										<SelectTrigger className="rounded-xl h-10 bg-slate-50/50 border-slate-200 font-bold ps-10 hover:bg-white hover:border-indigo-200 transition-all shadow-sm text-xs">
											<User className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-indigo-400" />
											<SelectValue placeholder="اختر العضو...">
												{assignedUserId
													? teamMembers.find((m) => m.id === assignedUserId)
															?.name
													: undefined}
											</SelectValue>
										</SelectTrigger>
										<SelectContent
											className="rounded-2xl shadow-2xl border-none p-1"
											dir="rtl"
										>
											{loadingMembers ? (
												<div className="p-6 text-center">
													<Loader2 className="h-6 w-6 animate-spin text-indigo-600 inline" />
												</div>
											) : (
												teamMembers.map((m) => (
													<SelectItem
														key={m.id}
														value={m.id}
														className="font-bold py-3 rounded-xl focus:bg-indigo-50 focus:text-indigo-700"
													>
														<div className="flex flex-col gap-0.5">
															<span>{m.name}</span>
															<span className="text-[10px] text-slate-400 font-medium">
																{m.email}
															</span>
														</div>
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								</div>

								{/* Notifications */}
								<div className="pt-4 mt-4 border-t border-slate-200/50">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2">
											<Bell
												className={cn(
													"h-4 w-4",
													reminderEnabled ? "text-amber-500" : "text-slate-300",
												)}
											/>
											<span
												className={cn(
													"text-xs font-black",
													reminderEnabled ? "text-slate-900" : "text-slate-400",
												)}
											>
												التنبيهات
											</span>
										</div>
										<button
											onClick={() => setReminderEnabled(!reminderEnabled)}
											className={cn(
												"h-6 w-11 rounded-full transition-all relative flex items-center px-1",
												reminderEnabled ? "bg-indigo-600" : "bg-slate-200",
											)}
										>
											<div
												className={cn(
													"h-4 w-4 bg-white rounded-full transition-all shadow-sm",
													reminderEnabled ? "translate-x-0" : "-translate-x-5",
												)}
											/>
										</button>
									</div>

									{reminderEnabled && (
										<div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
											<span className="text-[10px] font-bold text-slate-400 shrink-0">
												تذكير قبل
											</span>
											<Select
												value={reminderDays}
												onValueChange={(val) => setReminderDays(val || "1")}
											>
												<SelectTrigger className="h-9 rounded-lg bg-indigo-50 border-indigo-100 text-[11px] font-black text-indigo-700 w-24">
													<SelectValue />
												</SelectTrigger>
												<SelectContent dir="rtl">
													<SelectItem value="1">١ يوم</SelectItem>
													<SelectItem value="2">٢ يوم</SelectItem>
													<SelectItem value="3">٣ أيام</SelectItem>
													<SelectItem value="7">أسبوع</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-4 gap-2 sm:gap-0 flex-row-reverse border-t border-slate-100 pt-4">
						<Button
							onClick={handleCreateEvent}
							disabled={loading}
							className="flex-1 rounded-xl h-9 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 font-black text-xs relative overflow-hidden group transition-all"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : isEdit ? (
								"تحديث الموعد"
							) : (
								"حفظ الموعد"
							)}
						</Button>
						<div className="w-2" />
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className="flex-1 rounded-xl h-9 font-black text-xs border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
						>
							إلغاء
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
