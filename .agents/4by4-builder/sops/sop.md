Here is your updated, production-ready **Standard Operating Procedure (SOP)** tailored for a focused **3-vehicle MVP** using your modern full-stack TypeScript stack (**TanStack Start, shadcn/ui, Neon DB, Better Auth, Drizzle ORM/Kit**).

---

# REVISED SOP: 4x4 Visualizer & Build Planner (MVP)

```
                       [ TanStack Start (SSR / Routing / Server Functions) ]
                                              |
      +------------------------+--------------+--------------+------------------------+
      |                        |                             |                        |
[ React Three Fiber ]    [ shadcn/ui ]               [ Better Auth ]          [ Drizzle ORM ]
 (3D GLTF Canvas)     (Configurator & BOM)          (Session / User)                 |
                                                                              [ Neon Serverless PG ]
```

---

## **Vehicle Selection: The Global Core 3**
Starting with just 3 vehicles reduces 3D asset overhead while maximizing global audience coverage:

1. **Toyota Land Cruiser (LC300):** Captures the GCC (Middle East), Australia, and Africa touring/overlanding market.
2. **Jeep Wrangler (JL):** The most universally modified 4x4 across North America, Europe, and the Middle East.
3. **Toyota Tacoma (3rd/4th Gen):** Dominates the North American overlanding aftermarket *(or substitute with **Toyota Hilux** if prioritizing Europe/Australia over the US)*.

---

## **Phase 1: Tech Stack Initialization & Infrastructure**

### 1.1 Project Setup
* Initialize a **TanStack Start** application with TypeScript and Tailwind CSS.
* Set up **shadcn/ui** for UI primitives (`Button`, `Sheet`, `Dialog`, `Progress`, `Card`, `Badge`, `Tabs`, `Separator`).

### 1.2 Database & ORM (Neon DB + Drizzle)
* Create a serverless PostgreSQL instance on **Neon**.
* Configure `@neondatabase/serverless` with **Drizzle ORM** and **Drizzle Kit** for schema migrations.

### 1.3 Schema Architecture (`schema.ts`)
```typescript
import { pgTable, text, timestamp, integer, numeric, jsonb, boolean } from "drizzle-orm/pg-core";

// Base Vehicles
export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), // "lc300", "wrangler-jl", "tacoma"
  name: text("name").notNull(),
  make: text("make").notNull(),
  baseWeightKg: integer("base_weight_kg").notNull(),
  maxGvmKg: integer("max_gvm_kg").notNull(), // Gross Vehicle Mass
  maxDynamicRoofKg: integer("max_dynamic_roof_kg").notNull(),
  baseModelUrl: text("base_model_url").notNull(), // S3/R2 path to .glb
});

// Single-Brand Parts Catalog (ARB/Ironman)
export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  partNumber: text("part_number").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "front_bumper", "roof_rack", "suspension", "winch"
  compatibleVehicleIds: text("compatible_vehicle_ids").array().notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  weightKg: integer("weight_kg").notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  proxy3dModelUrl: text("proxy_3d_model_url"), // Path to generic proxy .glb
  affiliateUrl: text("affiliate_url").notNull(),
});

// User Saved Builds
export const builds = pgTable("builds", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  vehicleId: text("vehicle_id").references(() => vehicles.id).notNull(),
  selectedPartIds: text("selected_part_ids").array().notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  totalWeightKg: integer("total_weight_kg").notNull(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 1.4 Authentication (Better Auth)
* Integrate **Better Auth** with the Drizzle adapter connected to Neon DB.
* Allow **Anonymous Sessions** so visitors can build vehicles and view reports without friction, with an option to **"Save Build"** via OAuth (Google / Apple) or Email OTP.

---

## **Phase 2: 3D Web Engine & Proxy Strategy**

### 2.1 3D Canvas Mounting in TanStack Start
* Use `@react-three/fiber` and `@react-three/drei`.
* **Important:** Wrap the 3D viewport in a client-only dynamic component (`clientOnly` or custom boundary) to prevent Next-gen SSR hydration mismatches in TanStack Start.

### 2.2 Asset Optimization
* Optimize `.glb` base vehicle meshes using `gltf-transform` (draco compression, texture resizing to max 1024x1024) to keep base vehicle files under **4MB–6MB**.
* Maintain **4 Global Accessory Proxies**:
  1. `bullbar_heavy.glb` (LC300 / Wrangler)
  2. `prerunner_bumper.glb` (Tacoma)
  3. `platform_roofrack.glb` (Universal)
  4. `hardshell_tent.glb` (Universal)
* Configure anchor points/empty nodes in Blender at the front bumper, roof rails, and recovery points for modular attachment.

---

## **Phase 3: Catalog Seeding & Fitment Logic**

1. Extract 25–40 core accessories from **ARB 4x4 Accessories** (or Ironman 4x4) across the 3 vehicles:
   * Front Bumpers / Bull Bars
   * Winches & Recovery
   * Roof Platforms & Rooftop Tents
   * Suspension Upgrades (Old Man Emu / Foam Cell Pro)
   * Side Steps / Rock Sliders
2. Write a Drizzle seeding script (`pnpm run db:seed`) to populate Neon DB with the parts, weights, prices, and vehicle compatibility arrays.

---

## **Phase 4: Configurator UI Flow (shadcn/ui)**

```
+-------------------------------------------------------------------------+
| [Header: Logo]  Vehicle: [ Toyota LC300 v ]    Weight: 145/650 kg  [Save]|
+------------------------------------+------------------------------------+
|                                    | Category: [ Bumpers | Racks | ... ]|
|                                    | ---------------------------------- |
|                                    | [x] ARB Summit Bar MkII            |
|       3D INTERACTIVE CANVAS        |     Price: $2,450 | +85kg          |
|       (Orbit, Pan, Zoom)           |                                    |
|                                    | [ ] ARB StealthBar                 |
|                                    |     Price: $1,890 | +38kg          |
|                                    | ---------------------------------- |
|                                    | [ + Add 10,000lb Winch ]           |
+------------------------------------+------------------------------------+
| Running Total: $4,340 | Payload Used: 32% | [ View Full Build Report ] |
+-------------------------------------------------------------------------+
```

* **Left Canvas (70% viewport):** 3D WebGL render with smooth orbit controls and lighting presets (Desert Dune / Workshop).
* **Right Panel (30% viewport / shadcn Sheet on mobile):** Accordion-based category selection showing parts with instant weight/price impact.
* **State Management:** URL search params (via TanStack Router) or lightweight client state (Zustand) keeping vehicle + part IDs in sync.

---

## **Phase 5: The Final Build Report & Recommendation Engine**

When the user clicks **"View Full Build Report"**, a dedicated route (`/builds/$buildId` or `/report`) renders a comprehensive analysis.

```
+-------------------------------------------------------------------------+
|                           FINAL BUILD REPORT                            |
|                     Vehicle: 2024 Toyota LC300                          |
+-------------------------------------------------------------------------+
| 1. ITEMIZATION (BOM)                                                    |
|    - ARB Summit Bull Bar         | $2,450.00 |  85 kg | 3.5 hrs install |
|    - Warn VR EVO 10-S Winch      | $1,050.00 |  32 kg | 2.0 hrs install |
|    - ARB Base Rack (Slimline)    | $1,120.00 |  28 kg | 1.5 hrs install |
|    - ARB Esperance Rooftop Tent  | $2,100.00 |  56 kg | 1.0 hrs install |
| ----------------------------------------------------------------------- |
|    Subtotal Parts: $6,720.00     | Total Added Weight: 201 kg           |
|    Est. Labor (8 hrs @ $100/hr): $800.00                                |
|    ESTIMATED TOTAL BUILD COST:   $7,520.00                              |
+-------------------------------------------------------------------------+
| 2. MECHANICAL & SAFETY RECOMMENDATIONS (Rule-Engine Output)             |
|    [!] CRITICAL: Front Axle Load (+117 kg on front end)                 |
|        Adding a steel bar + winch causes front-end sag (-35mm droop).   |
|        -> Recommendation: OME Heavy Constant Load Front Springs.        |
|                                                                         |
|    [i] INFO: Roof Load Capacity (84 kg / 100 kg Limit)                  |
|        Dynamic load within safety limits for high-speed corrugated sand.|
+-------------------------------------------------------------------------+
| [ Download PDF Report ]   [ Share Link ]   [ Order All via Retailer ->] |
+-------------------------------------------------------------------------+
```

### Recommendation Logic Rules (Executed via Server Function)

```typescript
export function generateRecommendations(vehicle: Vehicle, selectedParts: Part[]) {
  const recommendations: { type: "warning" | "danger" | "success"; message: string }[] = [];
  
  const frontWeight = selectedParts
    .filter(p => ["front_bumper", "winch"].includes(p.category))
    .reduce((sum, p) => sum + p.weightKg, 0);

  const roofWeight = selectedParts
    .filter(p => ["roof_rack", "rooftop_tent"].includes(p.category))
    .reduce((sum, p) => sum + p.weightKg, 0);

  const totalAdded = selectedParts.reduce((sum, p) => sum + p.weightKg, 0);

  // Rule 1: Front Axle Droop
  if (frontWeight >= 70) {
    recommendations.push({
      type: "warning",
      message: `Front-end load increased by +${frontWeight}kg. Upgraded heavy-duty front coil springs are strongly advised to restore factory ride height and headlight alignment.`
    });
  }

  // Rule 2: Dynamic Roof Limit Check
  if (roofWeight > vehicle.maxDynamicRoofKg * 0.85) {
    recommendations.push({
      type: "danger",
      message: `Roof load (${roofWeight}kg) is approaching maximum dynamic limit (${vehicle.maxDynamicRoofKg}kg). High center-of-gravity may increase body roll during off-camber maneuvers.`
    });
  }

  // Rule 3: Gross Vehicle Mass (GVM) Consumption
  const gvmPercentage = Math.round((totalAdded / vehicle.maxGvmKg) * 100);
  if (gvmPercentage > 50) {
    recommendations.push({
      type: "warning",
      message: `Accessories consume ${gvmPercentage}% of your remaining payload capacity before adding passengers, fuel, or cargo. Consider a certified GVM suspension upgrade.`
    });
  }

  return recommendations;
}
```

---

## **Phase 6: MVP Delivery Schedule (4-Week Sprint)**

| Week | Focus | Deliverables |
| :--- | :--- | :--- |
| **Week 1** | **Core Foundation** | TanStack Start setup, Neon DB provisioning, Drizzle schema & migrations, Better Auth configuration. |
| **Week 2** | **3D & Asset Pipeline** | Sourcing & compressing the 3 vehicles (`LC300`, `JL`, `Tacoma`), rigging the 4 proxy attachments in Three.js / R3F. |
| **Week 3** | **Configurator & Logic** | shadcn/ui customizer sidebar, weight & cost state calculation, rule engine for safety/suspension recommendations. |
| **Week 4** | **Report, PDF & Launch** | Final Build Report page, PDF export (`@react-pdf/renderer` or serverless headless print), affiliate link routing, mobile testing, and deployment to Vercel/Netlify. |
