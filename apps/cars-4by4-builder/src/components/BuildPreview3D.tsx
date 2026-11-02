import { Component, Suspense, lazy, useEffect, useState } from "react";

const Scene = lazy(() => import("./preview3d/Scene"));

class PreviewErrorBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function BuildPreview3D({
  vehicleId,
  partIds,
  className,
}: {
  vehicleId: string;
  partIds: string[];
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !hasWebGL()) {
    return <div className={className} aria-hidden />;
  }

  return (
    <div className={className} style={{ touchAction: "pan-y" }}>
      <Suspense fallback={<div className="h-full w-full" />}>
        <PreviewErrorBoundary>
          <Scene vehicleId={vehicleId} partIds={partIds} />
        </PreviewErrorBoundary>
      </Suspense>
    </div>
  );
}