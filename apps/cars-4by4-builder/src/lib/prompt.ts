type Detected = { make: string | null; model: string | null; color: string | null } | null;

export function describeVehicle(detected: Detected, fallbackName: string): string {
  const parts = detected ? [detected.color, detected.make, detected.model].filter(Boolean) : [];
  return parts.length > 0 ? parts.join(" ") : fallbackName;
}

export function buildRenderPrompt(vehicleDesc: string, snippets: string[]): string {
  return [
    `Edit this photo of a ${vehicleDesc}.`,
    "Keep the exact same vehicle, paint color, camera angle, lighting and background.",
    `Add these aftermarket upgrades with realistic, seamless fitment: ${snippets.join("; ")}.`,
    "Photorealistic automotive photography. Do not add any text, logos or watermarks.",
  ].join(" ");
}