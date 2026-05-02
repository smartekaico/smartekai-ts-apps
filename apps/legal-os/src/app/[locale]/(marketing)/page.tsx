import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
import { PostHogWrapper } from "@/components/marketing/PostHogWrapper";
import { SharedMarketingSections } from "@/components/marketing/SharedMarketingSections";
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: t("seoTitle"),
    description: t("seoDesc"),
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDesc"),
      type: "website",
      locale: locale,
    },
    twitter: {
      card: "summary_large_image",
      title: t("seoTitle"),
      description: t("seoDesc"),
    },
  };
}

export default async function HubLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Hero" });
  const th = await getTranslations({ locale, namespace: "Header" });
  const tl = await getTranslations({ locale, namespace: "Landing" });
  const isRtl = locale === "ar";

  return (
    <main className="flex-grow pt-24 bg-white selection:bg-indigo-500/30 font-sans overflow-hidden relative">
      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is safe here
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "SmarTekAI Hub OS",
            applicationCategory: "BusinessApplication",
            description: tl("seoDesc"),
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }),
        }}
      />

      {/* Dynamic Background */}
      <div
        className="absolute inset-0 w-full h-full z-0 opacity-60 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/15 rounded-full blur-[140px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -ml-32 -mb-32" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32 text-center max-w-5xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-black text-indigo-600 mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {t("badge")}
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
          {t("titlePrefix")}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-400 to-emerald-500">
            {t("titleSuffix")}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-medium mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          {t("subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <PostHogWrapper eventName="hero_request_demo_clicked">
            <DemoRequestModal
              trigger={
                <Button className="rounded-[2rem] h-16 px-12 font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-indigo-500/10 hover:scale-105 transition-all gap-3 active:scale-95">
                  {th("requestDemo")}
                  <ArrowRight
                    className={cn(
                      "h-5 w-5 transition-transform group-hover:translate-x-1",
                      isRtl && "rotate-180",
                    )}
                  />
                </Button>
              }
            />
          </PostHogWrapper>
          <PostHogWrapper eventName="hero_explore_solutions_clicked">
            <Link href="/solutions" className="group">
              <Button
                variant="ghost"
                className="rounded-[2rem] h-16 px-10 font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
              >
                {th("solutions")}
              </Button>
            </Link>
          </PostHogWrapper>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap justify-center gap-x-12 gap-y-6 text-slate-400 font-bold text-xs uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> ENTERPRISE SECURITY
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> ZERO DATA RETENTION
          </span>
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> PRIVATE DATA ISOLATION
          </span>
        </div>
      </section>

      <SharedMarketingSections />

      {/* Pricing Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              {tl("pricingSOP.headline")}
            </h2>
            <p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto">
              {tl("pricingSOP.subheadline")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Starter */}
            <div className="p-10 rounded-[2.5rem] border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:shadow-lg transition-all">
              <h3 className="text-2xl font-black text-slate-900 mb-4">
                {tl("pricingSOP.starterTitle")}
              </h3>
              <p className="text-slate-500 font-medium mb-8 flex-grow">
                {tl("pricingSOP.starterDesc")}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />{" "}
                  Pay-As-You-Go Credits
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Basic
                  Knowledge Base
                </div>
              </div>
            </div>

            {/* Professional */}
            <div className="p-10 rounded-[2.5rem] border-2 border-slate-900 bg-white flex flex-col relative scale-105 shadow-2xl shadow-slate-200">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">
                {tl("pricingSOP.proTitle")}
              </h3>
              <p className="text-slate-500 font-medium mb-8 flex-grow">
                {tl("pricingSOP.proDesc")}
              </p>
              <div className="mt-auto space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500" /> Large
                  Credit Pools
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500" /> Advanced
                  KB Limits
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500" /> Team
                  Collaboration
                </div>
              </div>
              <Button className="rounded-2xl h-14 w-full bg-slate-900 hover:bg-slate-800 font-black">
                Get Started
              </Button>
            </div>

            {/* Enterprise */}
            <div className="p-10 rounded-[2.5rem] border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:shadow-lg transition-all">
              <h3 className="text-2xl font-black text-slate-900 mb-4">
                {tl("pricingSOP.enterpriseTitle")}
              </h3>
              <p className="text-slate-500 font-medium mb-8 flex-grow">
                {tl("pricingSOP.enterpriseDesc")}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Custom
                  Volumes
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> API
                  Access
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />{" "}
                  Dedicated Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
