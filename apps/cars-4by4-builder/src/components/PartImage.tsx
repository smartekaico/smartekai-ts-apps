import { cn } from "@/lib/utils";

/** Parts have no licensed photo yet, so a neutral "photo coming soon" placeholder is shown. */
export function PartImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={cn("aspect-video w-full object-cover", className)} />;
  return (
    <img
      src="/part-placeholder.svg"
      alt={alt}
      loading="lazy"
      className={cn("aspect-video w-full object-cover", className)}
    />
  );
}