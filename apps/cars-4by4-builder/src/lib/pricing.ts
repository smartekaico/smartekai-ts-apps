export const LABOR_RATE_USD = 100;

type PricedPart = { priceUsd: string; laborHoursEst: string };

export function summarize(parts: PricedPart[]) {
  const partsUsd = parts.reduce((sum, p) => sum + Number(p.priceUsd), 0);
  const laborHours = Math.round(parts.reduce((sum, p) => sum + Number(p.laborHoursEst), 0) * 10) / 10;
  const laborUsd = laborHours * LABOR_RATE_USD;
  return { partsUsd, laborHours, laborUsd, totalUsd: partsUsd + laborUsd };
}