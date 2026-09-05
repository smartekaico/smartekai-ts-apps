import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";
import { generateBuild } from "@/lib/generate-build";

export const Route = createFileRoute("/upload")({
  validateSearch: (search: Record<string, unknown>): { parts: string[] } => ({
    parts: Array.isArray(search.parts) ? search.parts.map(String) : [],
  }),
  component: UploadStep,
});

function UploadStep() {
  const { parts } = Route.useSearch();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!file) return;
    setStatus("generating");
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("partIds", JSON.stringify(parts));

    const result = await generateBuild({ data: formData });
    if (result.status === "failed") {
      setError(result.validationError ?? "Something went wrong — try a different photo.");
      setStatus("error");
      return;
    }
    navigate({ to: "/builds/$sessionId", params: { sessionId: result.session.id } });
  }

  if (status === "generating") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg">Generating your build…</p>
        <p className="text-sm text-muted-foreground">This can take up to 30 seconds.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Step 2: Upload Your Vehicle Photo</h1>
      <div className="mt-4">
        <PhotoDropzone onFileSelected={setFile} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={!file} onClick={handleGenerate}>
          Generate My Build
        </Button>
      </div>
      {status === "error" && error && <Toast message={error} onDismiss={() => setStatus("idle")} />}
    </main>
  );
}