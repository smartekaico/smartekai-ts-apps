import { useEffect, useState } from "react";

const LINES = ["Reading your truck's lines…", "Fitting your upgrades…", "Matching light and shadows…"];

export function BuildProgress() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((n) => (n + 1) % LINES.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-lg font-bold">{LINES[index]}</p>
      <p className="text-sm text-muted-foreground">
        This usually takes 1–2 minutes. You can leave — this page keeps your build.
      </p>
    </div>
  );
}
