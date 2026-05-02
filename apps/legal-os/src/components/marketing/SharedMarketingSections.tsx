"use client";

import {
  PlatformValueSection,
  ProductShowcase,
  SecuritySection,
  type MarketingCard,
  type MarketingProduct,
} from "@smartekai/marketing";
import {
  Activity,
  Beaker,
  BrainCircuit,
  Calendar,
  CreditCard,
  Database,
  FileText,
  Layers,
  MessageSquare,
  Mic,
  PenTool,
  Scale,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function SharedMarketingSections() {
  const tl = useTranslations("Landing");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const platformCards: MarketingCard[] = [
    {
      icon: Layers,
      title: tl("valueProp1Title"),
      description: tl("valueProp1Desc"),
    },
    {
      icon: Database,
      title: tl("valueProp2Title"),
      description: tl("valueProp2Desc"),
    },
    {
      icon: CreditCard,
      title: tl("valueProp3Title"),
      description: tl("valueProp3Desc"),
    },
  ];

  const products: MarketingProduct[] = [
    {
      key: "legal",
      name: isRtl ? "النظام القانوني" : "Legal OS",
      eyebrow: tl("legalOS.eyebrow"),
      title: isRtl ? "النظام القانوني" : "Legal OS",
      headline: tl("legalOS.headline"),
      description: tl("legalOS.subheadline"),
      href: "/products/legal-assistant-os",
      icon: Scale,
      features: [
        {
          icon: MessageSquare,
          title: tl("legalOS.feature1Title"),
          description: tl("legalOS.feature1Desc"),
        },
        {
          icon: FileText,
          title: tl("legalOS.feature2Title"),
          description: tl("legalOS.feature2Desc"),
        },
        {
          icon: PenTool,
          title: tl("legalOS.feature3Title"),
          description: tl("legalOS.feature3Desc"),
        },
        {
          icon: Calendar,
          title: tl("legalOS.feature4Title"),
          description: tl("legalOS.feature4Desc"),
        },
      ],
    },
    {
      key: "medical",
      name: isRtl ? "النظام الطبي" : "Medical OS",
      eyebrow: tl("medicalOS.eyebrow"),
      title: isRtl ? "النظام الطبي" : "Medical OS",
      headline: tl("medicalOS.headline"),
      description: tl("medicalOS.subheadline"),
      href: "/products/medical-scribe",
      icon: Stethoscope,
      features: [
        {
          icon: Mic,
          title: tl("medicalOS.feature1Title"),
          description: tl("medicalOS.feature1Desc"),
        },
        {
          icon: FileText,
          title: tl("medicalOS.feature2Title"),
          description: tl("medicalOS.feature2Desc"),
        },
        {
          icon: Beaker,
          title: tl("medicalOS.feature3Title"),
          description: tl("medicalOS.feature3Desc"),
        },
        {
          icon: Activity,
          title: tl("medicalOS.feature4Title"),
          description: tl("medicalOS.feature4Desc"),
        },
      ],
    },
  ];

  const securityCards: MarketingCard[] = [
    {
      icon: ShieldCheck,
      title: tl("securitySection.item1Title"),
      description: tl("securitySection.item1Desc"),
    },
    {
      icon: Users,
      title: tl("securitySection.item2Title"),
      description: tl("securitySection.item2Desc"),
    },
    {
      icon: BrainCircuit,
      title: tl("securitySection.item3Title"),
      description: tl("securitySection.item3Desc"),
    },
  ];

  return (
    <>
      <PlatformValueSection
        title={tl("capabilitiesTitle")}
        description={tl("capabilitiesDesc")}
        cards={platformCards}
      />
      <ProductShowcase products={products} initialProduct="legal" />
      <SecuritySection
        eyebrow={tl("securitySection.badge")}
        title={tl("securitySection.headline")}
        description={tl("securitySection.title")}
        cards={securityCards}
      />
    </>
  );
}
