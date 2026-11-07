// Pure helper: map a detected make/model to a supported vehicle id.
// Returns null when no supported vehicle matches. Make and model must both
// agree where a make is given; generation/year are not judged.

type Alias = { id: string; make: string; models: string[] };

const ALIASES: Alias[] = [
  { id: "lc300", make: "toyota", models: ["land cruiser", "landcruiser", "lc300", "lc 300", "lc"] },
  { id: "patrol-y62", make: "nissan", models: ["patrol", "patrol y62", "y62"] },
  { id: "wrangler-jl", make: "jeep", models: ["wrangler", "wrangler jl", "jl"] },
  { id: "f150", make: "ford", models: ["f-150", "f150", "f 150", "f-150 raptor"] },
  { id: "silverado-1500", make: "chevrolet", models: ["silverado", "silverado 1500"] },
  { id: "sierra-1500", make: "gmc", models: ["sierra", "sierra 1500"] },
  { id: "tacoma-3g", make: "toyota", models: ["tacoma", "tacoma 3g"] },
];

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchVehicle(make: string | null, model: string | null): string | null {
  const m = norm(make);
  const mo = norm(model);
  if (!mo) return null;

  const hits: string[] = [];
  for (const a of ALIASES) {
    const modelMatch = a.models.some((cand) => {
      const cn = norm(cand);
      return mo === cn || mo.includes(cn) || cn.includes(mo);
    });
    if (!modelMatch) continue;
    // make must agree when provided
    if (m && a.make !== m && !m.includes(a.make) && !a.make.includes(m)) continue;
    // make must agree when detected make is given and alias make differs
    if (m && a.make !== m) continue;
    hits.push(a.id);
  }
  // ambiguous (e.g. toyota + tacoma vs land cruiser both match model? no, models differ)
  if (hits.length !== 1) return null;
  return hits[0];
}