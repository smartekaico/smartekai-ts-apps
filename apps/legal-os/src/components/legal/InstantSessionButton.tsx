"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { CreateSessionModal } from "./CreateSessionModal";

interface InstantSessionButtonProps {
	className?: string;
	variant?: "default" | "outline" | "ghost";
	showIconOnly?: boolean;
}

export function InstantSessionButton({
	className,
	variant = "default",
	showIconOnly = false,
}: InstantSessionButtonProps) {
	const [open, setOpen] = useState(false);
	const t = useTranslations("Sessions");

	return (
		<>
			<Button
				variant={variant}
				onClick={() => setOpen(true)}
				className={cn(
					"gap-2 shadow-md transition-all hover:scale-[1.02]",
					showIconOnly && "gap-0",
					className,
				)}
			>
				<Plus className={cn("h-5 w-5", showIconOnly ? "mx-auto" : "")} />
				{!showIconOnly && (t("newSession") || "Start New Session")}
			</Button>

			<CreateSessionModal open={open} onOpenChange={setOpen} />
		</>
	);
}
