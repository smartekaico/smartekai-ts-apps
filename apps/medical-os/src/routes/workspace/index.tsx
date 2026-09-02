import { createFileRoute } from "@tanstack/react-router";
import { MedicalDashboard } from "@/components/dashboard/MedicalDashboard";

export const Route = createFileRoute("/workspace/")({
  component: MedicalDashboard,
});
