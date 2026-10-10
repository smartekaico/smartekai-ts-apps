import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

export function PhotoDropzone({ onFileSelected, disabled }: { onFileSelected: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFile(file: File) {
    if (disabled) return;
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files.item(0);
        if (file) handleFile(file);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center",
        dragging ? "border-primary bg-primary/5" : "border-border bg-texture",
        disabled && "cursor-wait opacity-70",
      )}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Selected vehicle" className="h-full w-full object-contain" />
      ) : (
        <>
          <Camera aria-hidden className="h-10 w-10 text-primary" />
          <p className="mt-3 text-lg font-bold">Drop a photo of your 4x4</p>
          <p className="mt-1 text-sm text-muted-foreground">Side profile or 3/4 front angle, in daylight. JPG, PNG or WebP, up to 10 MB.</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.item(0);
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
