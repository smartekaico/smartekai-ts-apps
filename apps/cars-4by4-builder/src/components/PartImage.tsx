import { cn } from "@/lib/utils";

export function PartImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <div aria-hidden className={cn("aspect-video w-full bg-muted bg-texture", className)} />;
  return <img src={src} alt={alt} loading="lazy" className={cn("aspect-video w-full object-cover", className)} />;
}
