import { useRouter } from "@tanstack/react-router";
import type { Region } from "@/lib/region";
import { cn } from "@/lib/utils";

const REGIONS: Array<{ id: Region; label: string }> = [
  { id: "us", label: "US" },
  { id: "gcc", label: "GCC" },
];

export function RegionSwitch({ region }: { region: Region }) {
  const router = useRouter();
  function choose(next: Region) {
    document.cookie = `region=${next}; path=/; max-age=31536000; samesite=lax`;
    void router.invalidate();
  }
  return (
    <div role="group" aria-label="Region" className="flex rounded-full border border-border p-0.5 text-xs">
      {REGIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          aria-pressed={region === r.id}
          onClick={() => choose(r.id)}
          className={cn(
            "rounded-full px-3 py-1 font-semibold",
            region === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
