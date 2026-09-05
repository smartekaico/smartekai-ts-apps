import { useRef, useState } from "react";

export function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);

  function handleMove(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full select-none overflow-hidden rounded-md"
      onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt="After" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 h-full overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeUrl} alt="Before" className="h-full w-full object-cover" style={{ width: `${100 / (position / 100 || 1)}%`, maxWidth: "none" }} />
      </div>
      <div
        className="absolute inset-y-0 w-1 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${position}%` }}
        onMouseDown={(e) => e.preventDefault()}
      />
    </div>
  );
}