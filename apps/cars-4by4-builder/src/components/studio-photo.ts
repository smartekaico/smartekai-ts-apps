// Most generated studio photos have an overhead light across the top ~10% of the
// frame. Zooming in from the bottom edge crops it out. A customer's own photo
// has no such band and is never cropped.
export const STUDIO_CROP = "origin-bottom scale-[1.13]";

export function isStudioPhoto(url: string): boolean {
  return url.includes("/stock/");
}
