"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMarketingProducts = void 0;
exports.MarketingHeader = MarketingHeader;
exports.MarketingHero = MarketingHero;
exports.PlatformValueSection = PlatformValueSection;
exports.ProductShowcase = ProductShowcase;
exports.SecuritySection = SecuritySection;
exports.MarketingFooter = MarketingFooter;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const ui_1 = require("@smartekai/ui");
const defaultNavItems = [
    { label: "Products", href: "#products" },
    { label: "Platform", href: "#platform" },
    { label: "Security", href: "#security" },
];
const platformCards = [
    {
        icon: lucide_react_1.Layers,
        title: "Thin product apps",
        description: "Launch Legal, Medical, and future SaaS products from app shells that reuse shared packages.",
    },
    {
        icon: lucide_react_1.Database,
        title: "Shared core engine",
        description: "Auth, billing, AI, data, UI, and emails live in packages instead of duplicated app code.",
    },
    {
        icon: lucide_react_1.ShieldCheck,
        title: "Tenant + product isolation",
        description: "Every product flow can enforce organization and product boundaries from the shared core.",
    },
];
const securityCards = [
    {
        icon: lucide_react_1.ShieldCheck,
        title: "Secrets stay in env",
        description: "No API keys are hardcoded into app shells.",
    },
    {
        icon: lucide_react_1.CheckCircle2,
        title: "Tenant boundaries",
        description: "Data access should be scoped by organization and product.",
    },
    {
        icon: lucide_react_1.BrainCircuit,
        title: "AI guardrails",
        description: "Domain prompts and retrieval can be managed centrally.",
    },
];
exports.defaultMarketingProducts = [
    {
        key: "legal",
        name: "Legal OS",
        eyebrow: "Smartek Legal OS",
        title: "Legal OS",
        headline: "The AI operating system for legal teams.",
        description: "Draft, analyze, research, and manage legal workspaces with secure organization-level data isolation.",
        href: "/products/legal-assistant-os",
        icon: lucide_react_1.Scale,
        features: [
            {
                icon: lucide_react_1.FileText,
                title: "Document analysis",
                description: "Summarize, classify, and extract key facts from legal files.",
            },
            {
                icon: lucide_react_1.PenTool,
                title: "Drafting workflows",
                description: "Generate memos, pleadings, and contracts from structured forms.",
            },
            {
                icon: lucide_react_1.Calendar,
                title: "Case workspace",
                description: "Organize drafts, events, clients, and sessions in one place.",
            },
        ],
    },
    {
        key: "medical",
        name: "Medical OS",
        eyebrow: "Smartek Medical OS",
        title: "Medical OS",
        headline: "Clinical documentation without the paperwork drag.",
        description: "Turn consultations and notes into structured clinical outputs while keeping product flows isolated.",
        href: "/workspace",
        icon: lucide_react_1.Stethoscope,
        features: [
            {
                icon: lucide_react_1.Mic,
                title: "Voice to SOAP",
                description: "Convert dictated or uploaded audio into structured medical notes.",
            },
            {
                icon: lucide_react_1.Activity,
                title: "Clinical assistant",
                description: "Use specialty-aware AI helpers for medical documentation workflows.",
            },
            {
                icon: lucide_react_1.ShieldCheck,
                title: "Private workspace",
                description: "Keep patient and organization data separated by product boundaries.",
            },
        ],
    },
    {
        key: "business",
        name: "Business OS",
        eyebrow: "Business automation",
        title: "Business OS",
        headline: "Operational AI for finance and back-office teams.",
        description: "Reusable automation primitives for document extraction, routing, and internal support agents.",
        href: "/products/business",
        icon: lucide_react_1.Building2,
        features: [
            {
                icon: lucide_react_1.Bot,
                title: "Workflow agents",
                description: "Automate repetitive support, triage, and operations tasks.",
            },
            {
                icon: lucide_react_1.Database,
                title: "Document ingestion",
                description: "Extract structured fields from bills, forms, and records.",
            },
            {
                icon: lucide_react_1.CreditCard,
                title: "Unified credits",
                description: "Reuse the same billing engine across all SaaS products.",
            },
        ],
    },
];
function BrandMark({ label }) {
    return ((0, jsx_runtime_1.jsxs)("a", { href: "/", className: "flex items-center gap-3 font-black text-slate-950", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-lg tracking-tight", children: label })] }));
}
function NavLinks({ items, onClick, }) {
    return items.map((item) => ((0, jsx_runtime_1.jsx)("a", { href: item.href, onClick: onClick, className: "rounded-full px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100 hover:text-slate-950", children: item.label }, item.href)));
}
function Section({ id, eyebrow, title, description, dark = false, children, }) {
    return ((0, jsx_runtime_1.jsx)("section", { id: id, className: (0, ui_1.cn)("px-6 py-24", dark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-950"), children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto max-w-7xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mx-auto mb-14 max-w-3xl text-center", children: [eyebrow ? ((0, jsx_runtime_1.jsx)("div", { className: (0, ui_1.cn)("mb-6 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest", dark
                                ? "border-white/10 bg-white/5 text-indigo-300"
                                : "border-slate-200 bg-white text-indigo-600"), children: eyebrow })) : null, (0, jsx_runtime_1.jsx)("h2", { className: "text-3xl font-black tracking-tight sm:text-5xl", children: title }), (0, jsx_runtime_1.jsx)("p", { className: (0, ui_1.cn)("mt-5 text-lg font-medium leading-8", dark ? "text-slate-400" : "text-slate-500"), children: description })] }), children] }) }));
}
function CardGrid({ cards, dark = false, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "grid gap-6 md:grid-cols-3", children: cards.map(({ icon: Icon, title, description }) => ((0, jsx_runtime_1.jsxs)("div", { className: (0, ui_1.cn)("rounded-[2rem] border p-8", dark
                ? "border-white/10 bg-white/[0.03]"
                : "border-slate-100 bg-white shadow-sm"), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, ui_1.cn)("mb-6 flex h-14 w-14 items-center justify-center rounded-2xl", dark
                        ? "bg-white/5 text-indigo-300"
                        : "bg-indigo-50 text-indigo-600"), children: (0, jsx_runtime_1.jsx)(Icon, { className: "h-7 w-7" }) }), (0, jsx_runtime_1.jsx)("h3", { className: (0, ui_1.cn)("text-xl font-black", dark ? "text-white" : "text-slate-950"), children: title }), (0, jsx_runtime_1.jsx)("p", { className: (0, ui_1.cn)("mt-3 font-medium leading-7", dark ? "text-slate-400" : "text-slate-500"), children: description })] }, title))) }));
}
function MarketingHeader({ logoText = "SmarTekAI", navItems = defaultNavItems, ctaLabel = "Open workspace", ctaHref = "/workspace", loginHref = "/login", loginLabel = "Login", }) {
    const [open, setOpen] = React.useState(false);
    return ((0, jsx_runtime_1.jsxs)("header", { className: "sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl", children: [(0, jsx_runtime_1.jsxs)("nav", { className: "mx-auto flex max-w-7xl items-center justify-between px-6 py-4", children: [(0, jsx_runtime_1.jsx)(BrandMark, { label: logoText }), (0, jsx_runtime_1.jsx)("div", { className: "hidden items-center gap-1 lg:flex", children: (0, jsx_runtime_1.jsx)(NavLinks, { items: navItems }) }), (0, jsx_runtime_1.jsxs)("div", { className: "hidden items-center gap-3 lg:flex", children: [(0, jsx_runtime_1.jsx)("a", { href: loginHref, className: "px-3 text-sm font-black text-slate-700 hover:text-slate-950", children: loginLabel }), (0, jsx_runtime_1.jsx)(ui_1.Button, { asChild: true, className: "rounded-full bg-slate-950 px-5 font-black text-white hover:bg-indigo-600", children: (0, jsx_runtime_1.jsx)("a", { href: ctaHref, children: ctaLabel }) })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setOpen((value) => !value), className: "rounded-2xl border border-slate-200 p-2 text-slate-700 lg:hidden", "aria-label": "Toggle menu", children: open ? (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-5 w-5" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { className: "h-5 w-5" }) })] }), open ? ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-slate-100 bg-white px-6 py-4 lg:hidden", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)(NavLinks, { items: navItems, onClick: () => setOpen(false) }), (0, jsx_runtime_1.jsx)(ui_1.Button, { asChild: true, className: "mt-3 rounded-2xl bg-slate-950 font-black text-white", children: (0, jsx_runtime_1.jsx)("a", { href: ctaHref, children: ctaLabel }) })] }) })) : null] }));
}
function MarketingHero({ badge = "Compound AI SaaS Platform", title, highlight, description, primaryCta = { label: "Open workspace", href: "/workspace" }, secondaryCta = { label: "Explore products", href: "#products" }, }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "relative overflow-hidden bg-white px-6 py-24 sm:py-32", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute right-[-10rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mx-auto max-w-5xl text-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-4 w-4 text-amber-500" }), badge] }), (0, jsx_runtime_1.jsxs)("h1", { className: "text-5xl font-black tracking-tight text-slate-950 sm:text-7xl", children: [title, highlight ? ((0, jsx_runtime_1.jsx)("span", { className: "block bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent", children: highlight })) : null] }), (0, jsx_runtime_1.jsx)("p", { className: "mx-auto mt-8 max-w-3xl text-lg font-medium leading-8 text-slate-500 sm:text-xl", children: description }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row", children: [(0, jsx_runtime_1.jsx)(ui_1.Button, { asChild: true, className: "h-14 rounded-2xl bg-slate-950 px-8 text-base font-black text-white hover:bg-indigo-600", children: (0, jsx_runtime_1.jsxs)("a", { href: primaryCta.href, children: [primaryCta.label, (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "ms-2 h-5 w-5" })] }) }), (0, jsx_runtime_1.jsx)(ui_1.Button, { asChild: true, variant: "outline", className: "h-14 rounded-2xl px-8 text-base font-black", children: (0, jsx_runtime_1.jsx)("a", { href: secondaryCta.href, children: secondaryCta.label }) })] })] })] }));
}
function PlatformValueSection({ id = "platform", title = "One platform, many products.", description = "The reusable core stays in packages while each app focuses on product-specific positioning and workflows.", cards = platformCards, }) {
    return ((0, jsx_runtime_1.jsx)(Section, { id: id, title: title, description: description, children: (0, jsx_runtime_1.jsx)(CardGrid, { cards: cards }) }));
}
function ProductShowcase({ products = exports.defaultMarketingProducts, initialProduct = "medical", }) {
    const [active, setActive] = React.useState(initialProduct);
    const current = products.find((product) => product.key === active) || products[0];
    const ProductIcon = current.icon;
    return ((0, jsx_runtime_1.jsx)("section", { id: "products", className: "bg-white px-6 py-24", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto max-w-7xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-12 flex flex-wrap justify-center gap-3", children: products.map(({ key, name, icon: Icon }) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActive(key), className: (0, ui_1.cn)("flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-black transition", active === key
                            ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-200"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "h-4 w-4" }), name] }, key))) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid items-center gap-12 lg:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500", children: current.eyebrow }), (0, jsx_runtime_1.jsx)("h2", { className: "text-4xl font-black tracking-tight text-slate-950 sm:text-5xl", children: current.headline }), (0, jsx_runtime_1.jsx)("p", { className: "mt-6 text-lg font-medium leading-8 text-slate-500", children: current.description }), (0, jsx_runtime_1.jsx)("div", { className: "mt-10", children: (0, jsx_runtime_1.jsx)(CardGrid, { cards: current.features }) }), (0, jsx_runtime_1.jsx)(ui_1.Button, { asChild: true, className: "mt-10 h-12 rounded-2xl bg-slate-950 px-6 font-black text-white hover:bg-indigo-600", children: (0, jsx_runtime_1.jsxs)("a", { href: current.href, children: ["Explore ", current.name] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 blur-3xl" }), (0, jsx_runtime_1.jsx)("div", { className: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl", children: (0, jsx_runtime_1.jsxs)("div", { className: "rounded-[2rem] border border-white/10 bg-slate-900 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6 flex items-center gap-2 border-b border-white/10 pb-4", children: [(0, jsx_runtime_1.jsx)("span", { className: "h-3 w-3 rounded-full bg-rose-400/70" }), (0, jsx_runtime_1.jsx)("span", { className: "h-3 w-3 rounded-full bg-amber-400/70" }), (0, jsx_runtime_1.jsx)("span", { className: "h-3 w-3 rounded-full bg-emerald-400/70" }), (0, jsx_runtime_1.jsx)("span", { className: "ms-auto rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/40", children: "Core engine" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 md:grid-cols-[0.8fr_1.2fr]", children: [(0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: current.features.map((feature) => ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-white/5 bg-white/[0.03] p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 text-white", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-4 w-4 text-emerald-400" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-black", children: feature.title })] }) }, feature.title))) }), (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-[18rem] items-center justify-center rounded-[2rem] border border-white/5 bg-white/[0.03]", children: (0, jsx_runtime_1.jsx)(ProductIcon, { className: "h-28 w-28 text-white/15" }) })] })] }) })] })] })] }) }));
}
function SecuritySection({ id = "security", eyebrow = "Security by design", title = "Built for confidential professional workflows.", description = "Shared packages centralize the security-sensitive pieces so every product app can enforce the same baseline.", cards = securityCards, }) {
    return ((0, jsx_runtime_1.jsx)(Section, { id: id, eyebrow: eyebrow, title: title, description: description, dark: true, children: (0, jsx_runtime_1.jsx)(CardGrid, { cards: cards, dark: true }) }));
}
function MarketingFooter({ logoText = "SmarTekAI", productLinks = exports.defaultMarketingProducts.map(({ name, href }) => ({
    label: name,
    href,
})), companyLinks = defaultNavItems, }) {
    return ((0, jsx_runtime_1.jsx)("footer", { className: "border-t border-slate-800 bg-slate-950 px-6 py-12 text-white", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr]", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-5", children: (0, jsx_runtime_1.jsx)(BrandMark, { label: logoText }) }), (0, jsx_runtime_1.jsx)("p", { className: "max-w-md text-sm font-medium leading-7 text-slate-400", children: "A compound AI SaaS platform for launching industry products from a reusable core engine." })] }), (0, jsx_runtime_1.jsx)(FooterColumn, { title: "Products", links: productLinks }), (0, jsx_runtime_1.jsx)(FooterColumn, { title: "Company", links: companyLinks })] }) }));
}
function FooterColumn({ title, links, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "mb-5 text-xs font-black uppercase tracking-widest text-slate-400", children: title }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsx)(NavLinks, { items: links }) })] }));
}
