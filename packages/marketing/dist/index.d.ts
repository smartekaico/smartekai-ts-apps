import * as React from "react";
type Icon = React.ComponentType<{
    className?: string;
}>;
export type ProductKey = "legal" | "medical" | "business";
export interface MarketingNavItem {
    label: string;
    href: string;
}
export interface MarketingCard {
    icon: Icon;
    title: string;
    description: string;
}
export interface MarketingProduct extends MarketingCard {
    key: ProductKey;
    name: string;
    eyebrow: string;
    headline: string;
    href: string;
    features: MarketingCard[];
}
export declare const defaultMarketingProducts: MarketingProduct[];
export declare function MarketingHeader({ logoText, navItems, ctaLabel, ctaHref, loginHref, loginLabel, }: {
    logoText?: string;
    navItems?: MarketingNavItem[];
    ctaLabel?: string;
    ctaHref?: string;
    loginHref?: string;
    loginLabel?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function MarketingHero({ badge, title, highlight, description, primaryCta, secondaryCta, }: {
    badge?: string;
    title: string;
    highlight?: string;
    description: string;
    primaryCta?: MarketingNavItem;
    secondaryCta?: MarketingNavItem;
}): import("react/jsx-runtime").JSX.Element;
export declare function PlatformValueSection({ id, title, description, cards, }: {
    id?: string;
    title?: string;
    description?: string;
    cards?: MarketingCard[];
}): import("react/jsx-runtime").JSX.Element;
export declare function ProductShowcase({ products, initialProduct, }: {
    products?: MarketingProduct[];
    initialProduct?: ProductKey;
}): import("react/jsx-runtime").JSX.Element;
export declare function SecuritySection({ id, eyebrow, title, description, cards, }: {
    id?: string;
    eyebrow?: string;
    title?: string;
    description?: string;
    cards?: MarketingCard[];
}): import("react/jsx-runtime").JSX.Element;
export declare function MarketingFooter({ logoText, tagline, productLinks, companyLinks, }: {
    logoText?: string;
    tagline?: string;
    productLinks?: MarketingNavItem[];
    companyLinks?: MarketingNavItem[];
}): import("react/jsx-runtime").JSX.Element;
export {};
