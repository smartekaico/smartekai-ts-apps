// PLACEHOLDER CATALOG: imageUrl "" and affiliateUrl null until real, permitted
// values are supplied (spec §7). Buy buttons stay hidden for parts without a
// URL. vehicleIds = all three until real fitment data.
const ALL = ["lc300", "patrol-y62", "wrangler-jl"];

type SeedPart = {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  aiPromptSnippet: string;
};

const catalog: SeedPart[] = [
  // Armor
  { id: "arb-summit-bullbar", name: "ARB Summit Bull Bar", category: "armor", brand: "ARB", priceUsd: "2450.00", laborHoursEst: "3.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a matte black heavy-duty steel bull bar with integrated recovery points and round driving lights on the front bumper" },
  { id: "arb-stealthbar", name: "ARB StealthBar", category: "armor", brand: "ARB", priceUsd: "1890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile matte black stealth front bumper with integrated fog lights" },
  { id: "ironman-rock-sliders", name: "Ironman 4x4 Rock Sliders", category: "armor", brand: "Ironman 4x4", priceUsd: "890.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "black powder-coated steel rock sliders along the rocker panels" },
  { id: "smittybilt-src", name: "Smittybilt SRC Side Armor", category: "armor", brand: "Smittybilt", priceUsd: "620.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "textured black tubular side armor bars along the rocker panels" },
  { id: "arb-underbody-armor", name: "ARB Underbody Armor Kit", category: "armor", brand: "ARB", priceUsd: "540.00", laborHoursEst: "2.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visible steel skid plate beneath the front bumper" },
  // Wheels & Tires
  { id: "method-beadlock-701", name: "Method 701 Beadlock Wheels", category: "wheels_tires", brand: "Method", priceUsd: "1840.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "bronze 17-inch beadlock-style wheels with visible bolt rings" },
  { id: "nitto-ridge-grappler-35", name: "35\" Nitto Ridge Grappler Tires", category: "wheels_tires", brand: "Nitto", priceUsd: "1600.00", laborHoursEst: "1.5", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "35-inch aggressive hybrid all-terrain/mud-terrain tires with deep chunky tread" },
  { id: "bfg-km3-33", name: "33\" BFGoodrich KM3 Mud-Terrain Tires", category: "wheels_tires", brand: "BFGoodrich", priceUsd: "1280.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "33-inch mud-terrain tires with large tread blocks" },
  { id: "fuel-vector-wheels", name: "Fuel Vector Wheels", category: "wheels_tires", brand: "Fuel", priceUsd: "1120.00", laborHoursEst: "1.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "matte black 18-inch off-road wheels with a deep concave face" },
  // Overland
  { id: "frontrunner-slimline-ii", name: "Front Runner Slimline II Roof Rack", category: "overland", brand: "Front Runner", priceUsd: "1150.00", laborHoursEst: "1.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a slim black aluminum platform roof rack mounted flush to the roofline" },
  { id: "arb-esperance-tent", name: "ARB Esperance Rooftop Tent", category: "overland", brand: "ARB", priceUsd: "2200.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a closed grey hardshell rooftop tent on the roof rack" },
  { id: "ironman-hardshell-tent", name: "Ironman 4x4 Hardshell Rooftop Tent", category: "overland", brand: "Ironman 4x4", priceUsd: "2450.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a low-profile black hardshell rooftop tent on the roof" },
  { id: "arb-270-awning", name: "ARB 270° Awning", category: "overland", brand: "ARB", priceUsd: "890.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a rolled-up 270-degree awning bag mounted along the side of the roof rack" },
  // Suspension
  { id: "ome-bp51", name: "Old Man Emu BP-51 Suspension Kit", category: "suspension", brand: "Old Man Emu", priceUsd: "3200.00", laborHoursEst: "6.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a visibly lifted stance with about 2 inches more wheel gap" },
  { id: "ironman-foam-cell", name: "Ironman 4x4 Foam Cell Suspension", category: "suspension", brand: "Ironman 4x4", priceUsd: "1620.00", laborHoursEst: "5.0", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a moderate 2-inch suspension lift with more ground clearance" },
  { id: "rough-country-lift-kit", name: "Rough Country 2.5\" Lift Kit", category: "suspension", brand: "Rough Country", priceUsd: "980.00", laborHoursEst: "4.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 2.5-inch suspension lift with a more aggressive stance" },
  { id: "bilstein-5100-shocks", name: "Bilstein 5100 Series Shocks", category: "suspension", brand: "Bilstein", priceUsd: "620.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "yellow-bodied performance shock absorbers visible behind the wheels" },
  // Lighting & Recovery
  { id: "rigid-led-lightbar", name: "Rigid 40\" LED Light Bar", category: "lighting", brand: "Rigid Industries", priceUsd: "650.00", laborHoursEst: "1.0", fitmentDifficulty: "Minor Trimming", aiPromptSnippet: "a 40-inch LED light bar mounted above the windshield" },
  { id: "kc-hilites-cube", name: "KC HiLiTES Cube LED Pods", category: "lighting", brand: "KC HiLiTES", priceUsd: "220.00", laborHoursEst: "0.5", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a pair of small square LED pod lights on the A-pillars" },
  { id: "ironman-snorkel", name: "Ironman 4x4 Snorkel", category: "lighting", brand: "Ironman 4x4", priceUsd: "310.00", laborHoursEst: "2.5", fitmentDifficulty: "Custom Fabrication", aiPromptSnippet: "a black safari snorkel running up the A-pillar to the roofline" },
  { id: "warn-vr-evo-10s", name: "Warn VR EVO 10-S Winch", category: "lighting", brand: "Warn", priceUsd: "1050.00", laborHoursEst: "2.0", fitmentDifficulty: "Direct Bolt-On", aiPromptSnippet: "a black recovery winch mounted at the front center of the bumper" },
];

export const seedParts = catalog.map((p) => ({
  ...p,
  imageUrl: "",
  vehicleIds: ALL,
  affiliateUrl: null,
}));
