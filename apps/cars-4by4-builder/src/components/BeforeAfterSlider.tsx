import { useRef, useState } from "react";
import { STUDIO_CROP, isStudioPhoto } from "@/components/studio-photo";
import { cn } from "@/lib/utils";

export function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const imageClass = cn("h-full w-full object-cover", isStudioPhoto(beforeUrl) && STUDIO_CROP);

  function moveTo(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={ref}
      className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-lg bg-muted"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e.clientX);
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <img src={afterUrl} alt="After: AI visualization with upgrades" draggable={false} className={imageClass} />
      </div>
      {/* The clip sits on a wrapper: on the zoomed image it would drift from the handle. */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img src={beforeUrl} alt="Before: original photo" draggable={false} className={imageClass} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]" style={{ left: `${position}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-black shadow-lg">
          ⇆
        </div>
      </div>
      <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Before</span>
      <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">After</span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Compare before and after"
        className="sr-only"
      />
    </div>
  );
}
