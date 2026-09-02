"use client";

import * as React from "react";

import {
  MarketingFooter,
  MarketingHeader,
  MarketingHero,
  PlatformValueSection,
  ProductShowcase,
  SecuritySection,
} from "./index";
import type {
  MarketingCard,
  MarketingNavItem,
  MarketingProduct,
  ProductKey,
} from "./index";

// SOURCE-OF-TRUTH: marketing landing page composition — one typed config per
// product app. Sections render with their existing markup so apps that mount
// them directly (legal-os mid-page, i18n wrappers) are never affected; new
// products ship a home page by exporting a config, not by writing JSX.
export interface MarketingSiteConfig {
  logoText: string;
  navItems?: MarketingNavItem[];
  cta?: { label: string; href: string };
  login?: { href: string; label: string };
  hero: {
    badge?: string;
    title: string;
    highlight?: string;
    description: string;
    primaryCta: MarketingNavItem;
    secondaryCta?: MarketingNavItem;
  };
  platform?:
    | false
    | { title?: string; description?: string; cards?: MarketingCard[] };
  showcase?: false | { products?: MarketingProduct[]; initialProduct?: ProductKey };
  security?:
    | false
    | {
        eyebrow?: string;
        title?: string;
        description?: string;
        cards?: MarketingCard[];
      };
  footer?: {
    tagline?: string;
    productLinks?: MarketingNavItem[];
    companyLinks?: MarketingNavItem[];
  };
}

const revealCss = `
@keyframes mk-reveal {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.mk-reveal { animation: mk-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .mk-reveal { animation: none; }
}
`;

export function MarketingLandingPage({ config }: { config: MarketingSiteConfig }) {
  const platform =
    config.platform && typeof config.platform === "object" ? config.platform : {};
  const showcase =
    config.showcase && typeof config.showcase === "object" ? config.showcase : {};
  const security =
    config.security && typeof config.security === "object" ? config.security : {};
  const footer = config.footer ?? {};

  return (
    <main className="min-h-screen bg-white text-slate-950 antialiased">
      <style>{revealCss}</style>
      <MarketingHeader
        logoText={config.logoText}
        {...(config.navItems ? { navItems: config.navItems } : {})}
        {...(config.cta
          ? { ctaLabel: config.cta.label, ctaHref: config.cta.href }
          : {})}
        {...(config.login
          ? { loginHref: config.login.href, loginLabel: config.login.label }
          : {})}
      />
      <MarketingHero {...config.hero} />
      {config.platform !== false ? (
        <div className="mk-reveal" style={{ animationDelay: "80ms" }}>
          <PlatformValueSection {...platform} />
        </div>
      ) : null}
      {config.showcase !== false ? (
        <div className="mk-reveal" style={{ animationDelay: "160ms" }}>
          <ProductShowcase {...showcase} />
        </div>
      ) : null}
      {config.security !== false ? (
        <div className="mk-reveal" style={{ animationDelay: "240ms" }}>
          <SecuritySection {...security} />
        </div>
      ) : null}
      <MarketingFooter
        logoText={config.logoText}
        {...(footer.tagline ? { tagline: footer.tagline } : {})}
        {...(footer.productLinks
          ? { productLinks: footer.productLinks }
          : {})}
        {...(footer.companyLinks
          ? { companyLinks: footer.companyLinks }
          : {})}
      />
    </main>
  );
}
