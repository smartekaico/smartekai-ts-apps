import { createFileRoute } from "@tanstack/react-router";
import { MarketingLandingPage } from "@smartekai/marketing/landing";
import { medicalSite } from "@/marketing/medical-site";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <MarketingLandingPage config={medicalSite} />;
}
