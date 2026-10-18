### 1. Best Free Sources for 4x4 Affiliate Links

All major affiliate platforms are free for publishers to join. Because you are targeting both the US and global markets (GCC, Australia), you should combine **specialized automotive networks** with **global marketplaces**:

| Platform / Network | Best For | Typical Commission | Key 4x4 Retailers / Brands Available |
| :--- | :--- | :--- | :--- |
| **Impact.com** *(Top Pick)* | US/Global 4x4 Retailers | 3% – 8% | **RealTruck**, **ExtremeTerrain**, **Quadratec**, **Front Runner (Dometic)** |
| **CJ Affiliate (Commission Junction)** | Large Retailers & Tires | 3% – 7% | **Tire Rack**, **4WD Supacentre (Aus)**, **AutoZone** |
| **ShareASale / Awin** | Overland Gear & Niche Brands | 5% – 12% | **Overland Vehicle Systems**, **Rough Country**, **Baja Designs** resellers |
| **eBay Partner Network (EPN)** | Hard-to-Find & Regional Parts | 1.5% – 4% | Essential for **Patrol Y62** and **Land Cruiser LC300** parts (imported from GCC/Australia/Japan) |
| **Amazon Associates** | Universal Accessories | 1% – 3% | Winches, recovery ropes, deflators, lights, emergency tools |

---

### 2. Best Practices for Implementing Affiliate Links

#### A. The "Smart Bridge" Pattern (Crucial for PDFs & Reports)
> ⚠️ **Major Compliance Warning:** Amazon Associates and several major affiliate programs **strictly forbid** placing raw affiliate links inside offline downloadable documents (PDFs, eBooks, offline apps). Doing so can get your affiliate account banned.

**The Solution:** Never put raw affiliate tracking URLs into your generated PDF reports. Instead, use an internal redirect endpoint on your TanStack Start server:

```
[ PDF Download ] 
      └── Link: https://yourapp.com/r/parts/arb-summit-bar?buildId=xyz
               └── (TanStack Start Server Function)
                     ├── Logs analytics / attribution in Neon DB
                     ├── Checks User GeoIP (US vs GCC vs Australia)
                     └── 302 Redirects to correct localized affiliate URL
```

* **Why this is essential:**
  1. **Compliance:** The link in the PDF points to your own website (100% compliant).
  2. **Link Longevity:** If a retailer changes affiliate networks or a part goes out of stock, you can change the target URL in your database once, and every previously downloaded PDF remains functional.
  3. **Geo-Targeting:** A user in Kuwait or Australia clicking on an ARB bumper can be routed to an Australian or global distributor, while a US user is routed to RealTruck.

#### B. Dynamic Sub-IDs for Attribution
Tag every link with a dynamic session/build ID (e.g., `&subId1=user_123&subId2=lc300_build`). This allows you to track in your affiliate dashboard which specific car builds and PDF reports generate real revenue.

#### C. Regulatory & FTC Disclaimers
Both US FTC guidelines and Google SEO policies mandate visible disclosures:
* **In the PDF Report:** Include a footer note: *“Some links in this report are affiliate links. If you purchase through them, we may earn a small commission at no additional cost to you.”*
* **On Blog Posts:** Add `rel="sponsored nofollow"` attributes to all outbound affiliate links to protect your search engine ranking.

---

### 3. Implementing an AI Research Agent for Affiliated Parts

Manually hunting for product links, updated prices, weights, and fitment details across multiple stores is tedious. You can build an **Automated Research Agent** directly inside your TanStack Start / TypeScript stack.

```
+---------------------------------------------------------------------------------+
|                               AI RESEARCH AGENT                                 |
+---------------------------------------------------------------------------------+
| [Input Trigger]: "ARB Summit Bull Bar for Toyota Land Cruiser LC300"            |
|                                     │                                           |
| [Tool 1: Web Search API] ───────────┴──> Searches Google/Bing for product pages |
| (Tavily / Serper API)                                                           |
|                                     │                                           |
| [Tool 2: Web Scraping] ─────────────┴──> Fetches clean Markdown of page         |
| (Firecrawl / Jina Reader)                                                       |
|                                     │                                           |
| [Tool 3: LLM Extraction] ───────────┴──> Extracts: Price, Weight, SKU, Live URL|
| (Claude 3.5 / GPT-4o-mini)                                                      |
|                                     │                                           |
| [Tool 4: Affiliate Injector] ───────┴──> Injects Affiliate Tag/Network Query    |
|                                     │                                           |
| [Output]: Automatically upserts part data into Neon DB via Drizzle ORM          |
+---------------------------------------------------------------------------------+
```

#### How the Agent Works in Code

You can implement this as a server-side utility or admin background job using **Vercel AI SDK**, **Tavily/Serper** (for real-time search), and **Firecrawl** (for extracting structured web data):

```typescript
// server/agent/researchPart.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "../db";
import { parts } from "../db/schema";

export async function researchAndEnrichPart(partName: string, vehicleModel: string) {
  // Step 1: Search the web for live retailer listings
  const searchQuery = `${partName} ${vehicleModel} buy price specs`;
  const searchResults = await fetch(`https://api.tavily.com/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: searchQuery, max_results: 3 }),
  }).then(res => res.json());

  // Step 2: Use LLM to extract clean product specs from search snippets/content
  const { object: partData } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      officialName: z.string(),
      partNumber: z.string(),
      estimatedPriceUsd: z.number(),
      weightKg: z.number(),
      sourceUrl: z.string().url(),
      fitmentNotes: z.string(),
    }),
    prompt: `Analyze these search results for the 4x4 part '${partName}' for vehicle '${vehicleModel}'. 
             Extract accurate price, weight in kg, manufacturer part number, and best purchase URL:
             ${JSON.stringify(searchResults.results)}`,
  });

  // Step 3: Inject your Affiliate Tracking Tag
  const affiliateUrl = formatAffiliateUrl(partData.sourceUrl);

  // Step 4: Persist in Neon DB via Drizzle ORM
  await db.insert(parts).values({
    id: `part_${Date.now()}`,
    name: partData.officialName,
    partNumber: partData.partNumber,
    priceUsd: partData.estimatedPriceUsd.toString(),
    weightKg: partData.weightKg,
    category: "armor_protection",
    compatibleVehicleIds: ["lc300"],
    laborHoursEst: "3.0",
    fitmentDifficulty: "Direct Bolt-On",
    aiPromptSnippet: `matte black steel ${partData.officialName}`,
    imageUrl: "/placeholder-part.jpg",
    affiliateUrl: affiliateUrl,
  });

  return partData;
}

function formatAffiliateUrl(targetUrl: string): string {
  const url = new URL(targetUrl);
  // Example: If retailer is on Impact or Amazon, append your publisher ID
  if (url.hostname.includes("amazon.com")) {
    url.searchParams.set("tag", "your-amazon-tag-20");
  } else if (url.hostname.includes("realtruck.com")) {
    return `https://realtruck.sjv.io/c/YOUR_ID/...?u=${encodeURIComponent(targetUrl)}`;
  }
  return url.toString();
}
```

### Strategic Benefits of This Setup
1. **Zero Data Maintenance:** Run this agent on a weekly cron job (`setInterval` or GitHub Action) to refresh prices, catch discontinued parts, and verify that your links aren't throwing `404 Not Found` errors.
2. **Instant Catalog Expansion:** To support a new category (e.g., "Snorkels for Nissan Patrol"), you feed a list of 10 names to the agent, and your database auto-populates with prices, weights, fitment ratings, and active affiliate links in minutes.
