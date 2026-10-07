import { createFileRoute } from "@tanstack/react-router";
import { SoapNoteEditor } from "@/components/session/SoapNoteEditor";

export const Route = createFileRoute("/workspace/notes")({
  component: QuickNotesPage,
});

function QuickNotesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
        <h1 className="text-lg font-black text-slate-900">Quick SOAP Note</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Record a consultation, generate a structured note, then copy or
          download it. No session required.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <SoapNoteEditor sessionId="quick-note" className="h-full" />
      </div>
    </div>
  );
}
