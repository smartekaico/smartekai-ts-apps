import { Link } from "@tanstack/react-router";
import type { Region } from "@/lib/region";
import { RegionSwitch } from "@/components/RegionSwitch";

export function SiteHeader({ region }: { region: Region }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/build" className="text-sm font-semibold hover:text-primary">
            Build yours
          </Link>
          <RegionSwitch region={region} />
        </div>
      </div>
    </header>
  );
}
