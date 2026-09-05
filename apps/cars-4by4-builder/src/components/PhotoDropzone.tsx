import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PhotoDropzone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex h-64 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 text-center",
        dragging ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Selected vehicle" className="h-full w-full object-contain" />
      ) : (
        <>
          <p className="font-medium">Drag & drop a photo of your 4x4</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Best results: 3/4 front-side angle or direct side profile, in daylight
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}