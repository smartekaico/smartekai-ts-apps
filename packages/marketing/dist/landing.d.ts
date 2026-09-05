import type { MarketingCard, MarketingNavItem, MarketingProduct, ProductKey } from "./index";
export interface MarketingSiteConfig {
    logoText: string;
    navItems?: MarketingNavItem[];
    cta?: {
        label: string;
        href: string;
    };
    login?: {
        href: string;
        label: string;
    };
    hero: {
        badge?: string;
        title: string;
        highlight?: string;
        description: string;
        primaryCta: MarketingNavItem;
        secondaryCta?: MarketingNavItem;
    };
    platform?: false | {
        title?: string;
        description?: string;
        cards?: MarketingCard[];
    };
    showcase?: false | {
        products?: MarketingProduct[];
        initialProduct?: ProductKey;
    };
    security?: false | {
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
export declare function MarketingLandingPage({ config }: {
    config: MarketingSiteConfig;
}): import("react/jsx-runtime").JSX.Element;
