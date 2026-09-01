"use client";

import * as React from "react";

import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  FileText,
  Layers,
  Menu,
  Mic,
  PenTool,
  Scale,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { Button, cn } from "@smartekai/ui";

type Icon = React.ComponentType<{ className?: string }>;
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

const defaultNavItems: MarketingNavItem[] = [
  { label: "Products", href: "#products" },
  { label: "Platform", href: "#platform" },
  { label: "Security", href: "#security" },
];

const platformCards: MarketingCard[] = [
  {
    icon: Layers,
    title: "Thin product apps",
    description:
      "Launch Legal, Medical, and future SaaS products from app shells that reuse shared packages.",
  },
  {
    icon: Database,
    title: "Shared core engine",
    description:
      "Auth, billing, AI, data, UI, and emails live in packages instead of duplicated app code.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant + product isolation",
    description:
      "Every product flow can enforce organization and product boundaries from the shared core.",
  },
];

const securityCards: MarketingCard[] = [
  {
    icon: ShieldCheck,
    title: "Secrets stay in env",
    description: "No API keys are hardcoded into app shells.",
  },
  {
    icon: CheckCircle2,
    title: "Tenant boundaries",
    description: "Data access should be scoped by organization and product.",
  },
  {
    icon: BrainCircuit,
    title: "AI guardrails",
    description: "Domain prompts and retrieval can be managed centrally.",
  },
];

export const defaultMarketingProducts: MarketingProduct[] = [
  {
    key: "legal",
    name: "Legal OS",
    eyebrow: "Smartek Legal OS",
    title: "Legal OS",
    headline: "The AI operating system for legal teams.",
    description:
      "Draft, analyze, research, and manage legal workspaces with secure organization-level data isolation.",
    href: "/products/legal-assistant-os",
    icon: Scale,
    features: [
      {
        icon: FileText,
        title: "Document analysis",
        description:
          "Summarize, classify, and extract key facts from legal files.",
      },
      {
        icon: PenTool,
        title: "Drafting workflows",
        description:
          "Generate memos, pleadings, and contracts from structured forms.",
      },
      {
        icon: Calendar,
        title: "Case workspace",
        description:
          "Organize drafts, events, clients, and sessions in one place.",
      },
    ],
  },
  {
    key: "medical",
    name: "Medical OS",
    eyebrow: "Smartek Medical OS",
    title: "Medical OS",
    headline: "Clinical documentation without the paperwork drag.",
    description:
      "Turn consultations and notes into structured clinical outputs while keeping product flows isolated.",
    href: "/workspace",
    icon: Stethoscope,
    features: [
      {
        icon: Mic,
        title: "Voice to SOAP",
        description:
          "Convert dictated or uploaded audio into structured medical notes.",
      },
      {
        icon: Activity,
        title: "Clinical assistant",
        description:
          "Use specialty-aware AI helpers for medical documentation workflows.",
      },
      {
        icon: ShieldCheck,
        title: "Private workspace",
        description:
          "Keep patient and organization data separated by product boundaries.",
      },
    ],
  },
  {
    key: "business",
    name: "Business OS",
    eyebrow: "Business automation",
    title: "Business OS",
    headline: "Operational AI for finance and back-office teams.",
    description:
      "Reusable automation primitives for document extraction, routing, and internal support agents.",
    href: "/products/business",
    icon: Building2,
    features: [
      {
        icon: Bot,
        title: "Workflow agents",
        description:
          "Automate repetitive support, triage, and operations tasks.",
      },
      {
        icon: Database,
        title: "Document ingestion",
        description:
          "Extract structured fields from bills, forms, and records.",
      },
      {
        icon: CreditCard,
        title: "Unified credits",
        description: "Reuse the same billing engine across all SaaS products.",
      },
    ],
  },
];

function BrandMark({ label }: { label: string }) {
  return (
    <a
      href="/"
      className="flex items-center gap-3 font-black text-slate-950"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="text-lg tracking-tight">{label}</span>
    </a>
  );
}

function NavLinks({
  items,
  onClick,
}: {
  items: MarketingNavItem[];
  onClick?: () => void;
}) {
  return items.map((item) => (
    <a
      key={item.href}
      href={item.href}
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
    >
      {item.label}
    </a>
  ));
}

function Section({
  id,
  eyebrow,
  title,
  description,
  dark = false,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-24",
        dark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950",
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          {eyebrow ? (
            <div
              className={cn(
                "mb-6 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest",
                dark
                  ? "border-white/10 bg-white/5 text-indigo-300"
                  : "border-slate-200 bg-white text-indigo-600",
              )}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
            {title}
          </h2>
          <p
            className={cn(
              "mt-5 text-lg font-medium leading-8",
              dark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {description}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function CardGrid({
  cards,
  dark = false,
}: {
  cards: MarketingCard[];
  dark?: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {cards.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className={cn(
            "rounded-[2rem] border p-8",
            dark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-100 bg-white shadow-sm",
          )}
        >
          <div
            className={cn(
              "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl",
              dark
                ? "bg-white/5 text-indigo-300"
                : "bg-indigo-50 text-indigo-600",
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h3
            className={cn(
              "text-xl font-black",
              dark ? "text-white" : "text-slate-950",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-3 font-medium leading-7",
              dark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MarketingHeader({
  logoText = "SmarTekAI",
  navItems = defaultNavItems,
  ctaLabel = "Open workspace",
  ctaHref = "/workspace",
  loginHref = "/login",
  loginLabel = "Login",
}: {
  logoText?: string;
  navItems?: MarketingNavItem[];
  ctaLabel?: string;
  ctaHref?: string;
  loginHref?: string;
  loginLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandMark label={logoText} />
        <div className="hidden items-center gap-1 lg:flex">
          <NavLinks items={navItems} />
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={loginHref}
            className="px-3 text-sm font-black text-slate-700 hover:text-slate-950"
          >
            {loginLabel}
          </a>
          <Button
            asChild
            className="rounded-full bg-slate-950 px-5 font-black text-white hover:bg-indigo-600"
          >
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-2xl border border-slate-200 p-2 text-slate-700 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open ? (
        <div className="border-t border-slate-100 bg-white px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            <NavLinks items={navItems} onClick={() => setOpen(false)} />
            <Button
              asChild
              className="mt-3 rounded-2xl bg-slate-950 font-black text-white"
            >
              <a href={ctaHref}>{ctaLabel}</a>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function MarketingHero({
  badge = "Compound AI SaaS Platform",
  title,
  highlight,
  description,
  primaryCta = { label: "Open workspace", href: "/workspace" },
  secondaryCta = { label: "Explore products", href: "#products" },
}: {
  badge?: string;
  title: string;
  highlight?: string;
  description: string;
  primaryCta?: MarketingNavItem;
  secondaryCta?: MarketingNavItem;
}) {
  return (
    <section className="relative overflow-hidden bg-white px-6 py-24 sm:py-32">
      <div className="absolute right-[-10rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {badge}
        </div>
        <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-7xl">
          {title}
          {highlight ? (
            <span className="block bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              {highlight}
            </span>
          ) : null}
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-lg font-medium leading-8 text-slate-500 sm:text-xl">
          {description}
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            className="h-14 rounded-2xl bg-slate-950 px-8 text-base font-black text-white hover:bg-indigo-600"
          >
            <a href={primaryCta.href}>
              {primaryCta.label}
              <ArrowRight className="ms-2 h-5 w-5" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-14 rounded-2xl px-8 text-base font-black"
          >
            <a href={secondaryCta.href}>{secondaryCta.label}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PlatformValueSection({
  id = "platform",
  title = "One platform, many products.",
  description = "The reusable core stays in packages while each app focuses on product-specific positioning and workflows.",
  cards = platformCards,
}: {
  id?: string;
  title?: string;
  description?: string;
  cards?: MarketingCard[];
}) {
  return (
    <Section id={id} title={title} description={description}>
      <CardGrid cards={cards} />
    </Section>
  );
}

export function ProductShowcase({
  products = defaultMarketingProducts,
  initialProduct = "medical",
}: {
  products?: MarketingProduct[];
  initialProduct?: ProductKey;
}) {
  const [active, setActive] = React.useState<ProductKey>(initialProduct);
  const current =
    products.find((product) => product.key === active) || products[0];
  const ProductIcon = current.icon;

  return (
    <section id="products" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {products.map(({ key, name, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-black transition",
                active === key
                  ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" />
              {name}
            </button>
          ))}
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
              {current.eyebrow}
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {current.headline}
            </h2>
            <p className="mt-6 text-lg font-medium leading-8 text-slate-500">
              {current.description}
            </p>
            <div className="mt-10">
              <CardGrid cards={current.features} />
            </div>
            <Button
              asChild
              className="mt-10 h-12 rounded-2xl bg-slate-950 px-6 font-black text-white hover:bg-indigo-600"
            >
              <a href={current.href}>Explore {current.name}</a>
            </Button>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
                <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                  <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                  <span className="ms-auto rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/40">
                    Core engine
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-3">
                    {current.features.map((feature) => (
                      <div
                        key={feature.title}
                        className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-center gap-3 text-white">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm font-black">
                            {feature.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.03]">
                    <ProductIcon className="h-28 w-28 text-white/15" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SecuritySection({
  id = "security",
  eyebrow = "Security by design",
  title = "Built for confidential professional workflows.",
  description = "Shared packages centralize the security-sensitive pieces so every product app can enforce the same baseline.",
  cards = securityCards,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  cards?: MarketingCard[];
}) {
  return (
    <Section
      id={id}
      eyebrow={eyebrow}
      title={title}
      description={description}
      dark
    >
      <CardGrid cards={cards} dark />
    </Section>
  );
}

export function MarketingFooter({
  logoText = "SmarTekAI",
  productLinks = defaultMarketingProducts.map(({ name, href }) => ({
    label: name,
    href,
  })),
  companyLinks = defaultNavItems,
}: {
  logoText?: string;
  productLinks?: MarketingNavItem[];
  companyLinks?: MarketingNavItem[];
}) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div>
          <div className="mb-5">
            <BrandMark label={logoText} />
          </div>
          <p className="max-w-md text-sm font-medium leading-7 text-slate-400">
            A compound AI SaaS platform for launching industry products from a
            reusable core engine.
          </p>
        </div>
        <FooterColumn title="Products" links={productLinks} />
        <FooterColumn title="Company" links={companyLinks} />
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: MarketingNavItem[];
}) {
  return (
    <div>
      <h3 className="mb-5 text-xs font-black uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      <div className="space-y-3">
        <NavLinks items={links} />
      </div>
    </div>
  );
}
