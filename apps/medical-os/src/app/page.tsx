import {
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
  PlatformValueSection,
  ProductShowcase,
  SecuritySection,
} from "@smartekai/marketing";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader
        logoText="SmarTekAI Medical OS"
        ctaLabel="Open Medical Workspace"
        ctaHref="/workspace"
        loginHref="/workspace"
        loginLabel="Workspace"
      />
      <MarketingHero
        badge="Medical OS • Non-i18n product shell"
        title="Clinical documentation"
        highlight="powered by the shared core."
        description="Medical OS now uses the shared marketing package while staying a simple English-only app shell. The product app can focus on SOAP generation, transcription, and clinical workflows instead of duplicating platform UI."
        primaryCta={{ label: "Open Medical Workspace", href: "/workspace" }}
        secondaryCta={{ label: "View shared products", href: "#products" }}
      />
      <PlatformValueSection />
      <ProductShowcase initialProduct="medical" />
      <SecuritySection />
      <MarketingFooter
        logoText="SmarTekAI Medical OS"
        productLinks={[
          { label: "Medical Workspace", href: "/workspace" },
          { label: "SOAP Generation", href: "/api/generate-soap" },
          { label: "Transcription API", href: "/api/transcribe" },
        ]}
        companyLinks={[
          { label: "Platform", href: "#platform" },
          { label: "Products", href: "#products" },
          { label: "Security", href: "#security" },
        ]}
      />
    </main>
  );
}
