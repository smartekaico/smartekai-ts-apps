import type { MarketingSiteConfig } from "@smartekai/marketing/landing";

// SOURCE-OF-TRUTH: medical-os marketing home content. A new product ships its
// landing page the same way — one config, no JSX (see @smartekai/marketing/landing).
export const medicalSite: MarketingSiteConfig = {
  logoText: "SmarTekAI Medical OS",
  cta: { label: "Open Medical Workspace", href: "/workspace" },
  login: { href: "/workspace", label: "Workspace" },
  hero: {
    badge: "Medical OS • Non-i18n product shell",
    title: "Clinical documentation",
    highlight: "powered by the shared core.",
    description:
      "Medical OS now uses the shared marketing package while staying a simple English-only app shell. The product app can focus on SOAP generation, transcription, and clinical workflows instead of duplicating platform UI.",
    primaryCta: { label: "Open Medical Workspace", href: "/workspace" },
    secondaryCta: { label: "Try the SOAP generator", href: "/workspace/notes" },
  },
  showcase: { initialProduct: "medical" },
  footer: {
    productLinks: [
      { label: "Medical Workspace", href: "/workspace" },
      { label: "SOAP Note Generator", href: "/workspace/notes" },
    ],
  },
};
