// PLACEHOLDER CATALOG: imageUrl "" and affiliateUrl null until real, permitted
// values are supplied (spec §7). Buy buttons stay hidden for parts without a
// URL. Fitment is SUV by default; parts that also fit a full-size pickup carry
// BOTH, and the truck-only parts carry TRUCKS.
const SUVS = ["lc300", "patrol-y62", "wrangler-jl"];
const TRUCKS = ["f150", "silverado-1500", "sierra-1500"];
const BOTH = [...SUVS, ...TRUCKS];

type SeedPart = {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  aiPromptSnippet: string;
  vehicleIds?: string[];
};

const catalog: SeedPart[] = [
  // Armor
  { id: "arb-summit-bullbar", name: "ARB Summit Bull Bar", category: "armor", brand: "ARB", priceUsd: "2450.00", laborHoursEst: "3.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a matte black heavy-duty steel bull bar with integrated recovery points and round driving lights on the front bumper" },
  { id: "arb-stealthbar", name: "ARB StealthBar", category: "armor", brand: "ARB", priceUsd: "1890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black stealth front bumper with integrated fog lights" },
  { id: "ironman-rock-sliders", name: "Ironman 4x4 Rock Sliders", category: "armor", brand: "Ironman 4x4", priceUsd: "890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "black powder-coated steel rock sliders along the rocker panels" },
  { id: "smittybilt-src", name: "Smittybilt SRC Side Armor", category: "armor", brand: "Smittybilt", priceUsd: "620.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "textured black tubular side armor bars along the rocker panels" },
  { id: "arb-underbody-armor", name: "ARB Underbody Armor Kit", category: "armor", brand: "ARB", priceUsd: "540.00", laborHoursEst: "2.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visible steel skid plate beneath the front bumper" },
  // Wheels & Tires
  { id: "method-beadlock-701", name: "Method 701 Beadlock Wheels", category: "wheels_tires", brand: "Method", priceUsd: "1840.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "bronze 17-inch beadlock-style wheels with visible bolt rings", vehicleIds: BOTH },
  { id: "nitto-ridge-grappler-35", name: "35\" Nitto Ridge Grappler Tires", category: "wheels_tires", brand: "Nitto", priceUsd: "1600.00", laborHoursEst: "1.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "35-inch aggressive hybrid all-terrain/mud-terrain tires with deep chunky tread", vehicleIds: BOTH },
  { id: "bfg-km3-33", name: "33\" BFGoodrich KM3 Mud-Terrain Tires", category: "wheels_tires", brand: "BFGoodrich", priceUsd: "1280.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "33-inch mud-terrain tires with large tread blocks", vehicleIds: BOTH },
  { id: "fuel-vector-wheels", name: "Fuel Vector Wheels", category: "wheels_tires", brand: "Fuel", priceUsd: "1120.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "matte black 18-inch off-road wheels with a deep concave face", vehicleIds: BOTH },
  // Overland
  { id: "frontrunner-slimline-ii", name: "Front Runner Slimline II Roof Rack", category: "overland", brand: "Front Runner", priceUsd: "1150.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a slim black aluminum platform roof rack mounted flush to the roofline" },
  { id: "arb-esperance-tent", name: "ARB Esperance Rooftop Tent", category: "overland", brand: "ARB", priceUsd: "2200.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a closed grey hardshell rooftop tent on the roof rack", vehicleIds: BOTH },
  { id: "ironman-hardshell-tent", name: "Ironman 4x4 Hardshell Rooftop Tent", category: "overland", brand: "Ironman 4x4", priceUsd: "2450.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile black hardshell rooftop tent on the roof", vehicleIds: BOTH },
  { id: "arb-270-awning", name: "ARB 270° Awning", category: "overland", brand: "ARB", priceUsd: "890.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a rolled-up 270-degree awning bag mounted along the side of the roof rack" },
  // Suspension
  { id: "ome-bp51", name: "Old Man Emu BP-51 Suspension Kit", category: "suspension", brand: "Old Man Emu", priceUsd: "3200.00", laborHoursEst: "6.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visibly lifted stance with about 2 inches more wheel gap" },
  { id: "ironman-foam-cell", name: "Ironman 4x4 Foam Cell Suspension", category: "suspension", brand: "Ironman 4x4", priceUsd: "1620.00", laborHoursEst: "5.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a moderate 2-inch suspension lift with more ground clearance" },
  { id: "rough-country-lift-kit", name: "Rough Country 2.5\" Lift Kit", category: "suspension", brand: "Rough Country", priceUsd: "980.00", laborHoursEst: "4.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 2.5-inch suspension lift with a more aggressive stance", vehicleIds: BOTH },
  { id: "bilstein-5100-shocks", name: "Bilstein 5100 Series Shocks", category: "suspension", brand: "Bilstein", priceUsd: "620.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "yellow-bodied performance shock absorbers visible behind the wheels", vehicleIds: BOTH },
  // Lighting & Recovery
  { id: "rigid-led-lightbar", name: "Rigid 40\" LED Light Bar", category: "lighting", brand: "Rigid Industries", priceUsd: "650.00", laborHoursEst: "1.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 40-inch LED light bar mounted above the windshield", vehicleIds: BOTH },
  { id: "kc-hilites-cube", name: "KC HiLiTES Cube LED Pods", category: "lighting", brand: "KC HiLiTES", priceUsd: "220.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a pair of small square LED pod lights on the A-pillars", vehicleIds: BOTH },
  { id: "ironman-snorkel", name: "Ironman 4x4 Snorkel", category: "lighting", brand: "Ironman 4x4", priceUsd: "310.00", laborHoursEst: "2.5", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a black safari snorkel running up the A-pillar to the roofline" },
  { id: "warn-vr-evo-10s", name: "Warn VR EVO 10-S Winch", category: "lighting", brand: "Warn", priceUsd: "1050.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black recovery winch mounted at the front center of the bumper", vehicleIds: BOTH },
  // Trucks — BAK is a RealTruck brand, so it is sold through RealTruck/Impact (spec §7)
  { id: "leitner-acs-forged", name: "Leitner ACS Forged Bed Rack", category: "overland", brand: "Leitner Designs", priceUsd: "1400.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black aluminum bed rack over the pickup bed, rising to cab height", vehicleIds: TRUCKS },
  { id: "bakflip-mx4", name: "BAKFlip MX4 Tonneau Cover", category: "overland", brand: "BAK", priceUsd: "1100.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black hard folding tonneau cover over the pickup bed", vehicleIds: TRUCKS },
  { id: "rough-country-6in-lift", name: "Rough Country 6\" Lift Kit", category: "suspension", brand: "Rough Country", priceUsd: "1600.00", laborHoursEst: "8.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a tall 6-inch suspension lift with much larger wheel gaps and an aggressive stance", vehicleIds: TRUCKS },
];

export const seedParts = catalog.map((p) => ({
  ...p,
  imageUrl: "",
  vehicleIds: p.vehicleIds ?? SUVS,
  affiliateUrl: null,
}));
