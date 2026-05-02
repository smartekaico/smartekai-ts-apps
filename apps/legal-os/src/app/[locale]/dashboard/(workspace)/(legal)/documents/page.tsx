import { redirect } from "next/navigation";

export default function SavedDocumentsPage() {
	redirect("/dashboard/history?tab=docs");
	return null;
}
