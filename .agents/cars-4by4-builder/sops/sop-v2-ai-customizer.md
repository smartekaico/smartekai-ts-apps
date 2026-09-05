This pivot is a massive leap forward for an MVP. By moving from **3D modeling (Three.js)** to **2D Generative AI (Vision + Inpainting)**, you eliminate the single hardest bottleneck (sourcing and rigging expensive 3D car models) and unlock the ability to support **any 4x4 car immediately**.

Seeing their *own actual car* transformed in a photorealistic AI photo creates an instant emotional connection and drastically increases conversion on purchase links.

---

# REVISED SOP: AI-Powered 4x4 Customizer & Upgrade Planner

```
[ Step 1: Select Upgrades ] -> [ Step 2: Upload Car Photo ] -> [ Step 3: Vision AI Validation ]
                                                                             |
[ Step 5: Final Report & Links ] <- [ Step 4: GenAI Image Transformation (Inpainting/ControlNet) ]
```

---

## **1. Updated Tech Stack & AI Architecture**

* **Framework:** **TanStack Start** (SSR, Streaming, Server Functions with `createServerFn`).
* **UI Components:** **shadcn/ui** (Cards, File Upload Dropzone, Carousel/Comparison Slider, Badges, Accordions).
* **Database & Auth:** **Neon DB** (Serverless Postgres) + **Better Auth** (Guest sessions + OAuth).
* **ORM & Migrations:** **Drizzle ORM & Drizzle Kit**.
* **File/Image Storage:** Cloudflare R2 or AWS S3 (via `@aws-sdk/client-s3` or UploadThing) for raw uploads and generated outputs.
* **AI Layer:**
  * **Vision & Validation:** GPT-4o-mini / Claude 3.5 Sonnet / Gemini Flash via Vercel AI SDK (validates image angle, detects car make/model/color/trim).
  * **Image Transformation:** **Fal.ai** or **Replicate** running **FLUX.1 [Inpainting/Depth]** or **SDXL with IP-Adapter/ControlNet** to mount realistic accessories directly onto the user's photo.

---

## **2. Database Schema (Drizzle ORM)**

```typescript
import { pgTable, text, timestamp, numeric, integer, jsonb, boolean } from "drizzle-orm/pg-core";

// Catalog of upgrades (ARB, Ironman, Method Wheels, etc.)
export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "front_bumper", "wheels_tires", "roof_tent", "lift_kit", "snorkel"
  brand: text("brand").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  fitmentDifficulty: text("fitment_difficulty").notNull(), // "Direct Bolt-On", "Minor Trimming", "Custom Fabrication"
  aiPromptSnippet: text("ai_prompt_snippet").notNull(), // e.g., "matte black heavy-duty steel bull bar with integrated recovery hooks and round driving lights"
  imageUrl: text("image_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
});

// Generated AI Transformation Sessions
export const upgradeSessions = pgTable("upgrade_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id"), // null if guest
  originalImageUrl: text("original_image_url").notNull(),
  transformedImageUrl: text("transformed_image_url"),
  detectedVehicle: jsonb("detected_vehicle"), // { make: "Toyota", model: "Land Cruiser", year: "2022", color: "Pearl White" }
  selectedPartIds: text("selected_part_ids").array().notNull(),
  status: text("status").default("pending").notNull(), // "pending" | "processing" | "completed" | "failed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## **3. Step-by-Step User Workflow & Implementation**

### **Step 1: Visual Upgrade Selection (Multi-Select)**
* **UI:** A grid of visual cards using shadcn/ui (`Card`, `Badge`, `Checkbox`).
* Categories:
  * 🛞 **Wheels & Tires:** Beadlock wheels, 33" or 35" All-Terrain / Mud-Terrain tires.
  * 🛡️ **Armor & Protection:** Heavy-duty front bull bars, stealth bumper, rock sliders.
  * ⛺ **Overlanding & Roof Gear:** Platform roof rack, hard-shell rooftop tent, 270° awning.
  * 💡 **Off-Road Lighting & Extras:** LED light bars, safari snorkel, recovery winch.
* User selects items (e.g., *"ARB Bull Bar"* + *"35-inch Mud Tires"* + *"Roof Tent"*).

---

### **Step 2: Upload Vehicle Photo**
* **UI:** A drag-and-drop zone with camera capture on mobile.
* **Instructions/Guides:** Provide visual overlays recommending a **3/4 Front-Side Angle** or a **Direct Side Profile** in good daylight for the best AI rendering.

---

### **Step 3: Server Function — Vision AI Validation & Auto-Detection**
When the user submits the image, a TanStack Start Server Function runs:

1. Uploads the raw image to Cloudflare R2 / S3.
2. Calls a Vision model with a structured JSON prompt:
   ```json
   {
     "isValidVehicle": true,
     "vehicleType": "4x4 SUV",
     "detectedMake": "Toyota",
     "detectedModel": "Land Cruiser LC300",
     "detectedColor": "White",
     "angle": "front_three_quarter",
     "validationError": null
   }
   ```
3. **If invalid** (e.g., user uploaded a sedan, blurry image, or interior photo), shadcn `Toast` immediately prompts: *"Please upload a clear exterior photo of your 4x4."*

---

### **Step 4: Generative AI Transformation Pipeline**
Once validated, trigger the image transformation via an asynchronous background job or real-time streaming endpoint:

1. **Construct the Inpainting/Transformation Prompt:**
   Combine the detected vehicle details with the `aiPromptSnippet` of each chosen part:
   > *"Photorealistic side-angle shot of a white Toyota Land Cruiser LC300 modified with: [matte black heavy-duty steel bull bar with round driving lights], [35-inch aggressive mud-terrain tires on bronze beadlock wheels], [ultra-slim aluminum platform roof rack mounted with a closed hardshell rooftop tent]. Professional automotive photography, realistic reflections, seamless fitment, 8k."*
2. **Execute Generation:**
   Call **Fal.ai (Flux Inpainting API)** or **Replicate (ControlNet/Depth pipeline)** using the user's original photo as the structural reference.
3. Save the resulting image URL to the database and update session status to `completed`.

---

### **Step 5: The Interactive Before/After & Final Report Page**

#### A. Visual Before/After Slider
* Implement an interactive **Image Comparison Slider** (sliding between the original photo and the AI-modified truck).

#### B. Itemized Bill of Materials (BOM) & Quote Table
| Upgrade Item | Fitment / Possibility Type | Estimated Labor | Part Price | Action |
| :--- | :--- | :--- | :--- | :--- |
| **ARB Summit Bull Bar** | Direct Bolt-on (Bumper cut required) | 3.5 hrs ($350) | $2,450.00 | [View Retailer ↗] |
| **35" Nitto Ridge Grapplers** | Requires 2" Lift + Cab Mount Trim | 1.5 hrs ($150) | $1,600.00 | [View Retailer ↗] |
| **Slimline II Roof Platform** | Factory Mounting Points (No drill) | 1.5 hrs ($150) | $1,150.00 | [View Retailer ↗] |
| **Hard-shell Rooftop Tent** | Clamps directly to platform | 0.5 hrs ($50) | $2,200.00 | [View Retailer ↗] |

* **Total Upgrades Cost:** $7,400.00
* **Estimated Installation:** $700.00
* **Estimated Total Build:** **$8,100.00**

#### C. Fitment & Mechanical Advisory Notes
* **Suspension Advisory:** *"Adding the selected steel bull bar (+85kg) will cause ~30mm front sag. A +2-inch heavy-duty spring kit is recommended."*
* **Tire Clearance Note:** *"Fitting 35-inch tires on this vehicle will require a minor cab-mount chop or offset wheel spacers to avoid rubbing at full steering lock."*

#### D. Sharing & Conversion Actions
* **"Download PDF Quote"** (Generates branded PDF with parts list and AI render).
* **"Share My Build"** (Creates a unique public URL: `/builds/[id]` with OpenGraph preview tags showing their AI car).
* **"Buy All Parts"** (Direct links embedded with affiliate tracking tags).

---

## **4. 3-Week MVP Execution Plan**

| Week | Focus | Deliverables |
| :--- | :--- | :--- |
| **Week 1** | **Foundation & Catalog** | TanStack Start + Neon + Drizzle setup. Better Auth configuration. Seed 30 core parts (ARB, Ironman, Method) with prompt snippets and affiliate links. |
| **Week 2** | **Upload & AI Pipeline** | S3/R2 storage integration. Vision validation endpoint. Fal.ai / Replicate Flux Inpainting API connector. |
| **Week 3** | **UI/UX & Final Report** | shadcn/ui multi-step wizard, Image Comparison Slider, Dynamic Quote Table, PDF export, and shareable `/builds/[id]` route. |
