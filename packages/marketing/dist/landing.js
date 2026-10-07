"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingLandingPage = MarketingLandingPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const index_1 = require("./index");
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
function MarketingLandingPage({ config }) {
    const platform = config.platform && typeof config.platform === "object" ? config.platform : {};
    const showcase = config.showcase && typeof config.showcase === "object" ? config.showcase : {};
    const security = config.security && typeof config.security === "object" ? config.security : {};
    const footer = config.footer ?? {};
    return ((0, jsx_runtime_1.jsxs)("main", { className: "min-h-screen bg-white text-slate-950 antialiased", children: [(0, jsx_runtime_1.jsx)("style", { children: revealCss }), (0, jsx_runtime_1.jsx)(index_1.MarketingHeader, { logoText: config.logoText, ...(config.navItems ? { navItems: config.navItems } : {}), ...(config.cta
                    ? { ctaLabel: config.cta.label, ctaHref: config.cta.href }
                    : {}), ...(config.login
                    ? { loginHref: config.login.href, loginLabel: config.login.label }
                    : {}) }), (0, jsx_runtime_1.jsx)(index_1.MarketingHero, { ...config.hero }), config.platform !== false ? ((0, jsx_runtime_1.jsx)("div", { className: "mk-reveal", style: { animationDelay: "80ms" }, children: (0, jsx_runtime_1.jsx)(index_1.PlatformValueSection, { ...platform }) })) : null, config.showcase !== false ? ((0, jsx_runtime_1.jsx)("div", { className: "mk-reveal", style: { animationDelay: "160ms" }, children: (0, jsx_runtime_1.jsx)(index_1.ProductShowcase, { ...showcase }) })) : null, config.security !== false ? ((0, jsx_runtime_1.jsx)("div", { className: "mk-reveal", style: { animationDelay: "240ms" }, children: (0, jsx_runtime_1.jsx)(index_1.SecuritySection, { ...security }) })) : null, (0, jsx_runtime_1.jsx)(index_1.MarketingFooter, { logoText: config.logoText, ...(footer.tagline ? { tagline: footer.tagline } : {}), ...(footer.productLinks
                    ? { productLinks: footer.productLinks }
                    : {}), ...(footer.companyLinks
                    ? { companyLinks: footer.companyLinks }
                    : {}) })] }));
}
