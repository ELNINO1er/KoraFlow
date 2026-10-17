import { publicPageMetadata, jsonLd, SITE_URL } from "@/lib/seo/site";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/constants/brand";
import { SolutionsSection } from "@/features/marketing/solutions-section";
import {
  MotionPreferencesProvider,
  MotionToggleButton,
} from "@/features/marketing/motion-preferences";
import { BrandFlowPath } from "@/features/marketing/kora-path";
import { Header } from "@/features/marketing/header";
import { HeroOrchestration } from "@/features/marketing/hero-orchestration";
import { ProblemFragmentation } from "@/features/marketing/problem-fragmentation";
import { JourneyTimeline } from "@/features/marketing/journey-timeline";
import { FeatureBento } from "@/features/marketing/feature-bento";
import { DashboardDemo } from "@/features/marketing/dashboard-demo";
import { ClientPortalDemo } from "@/features/marketing/client-portal-demo";
import { SecuritySection } from "@/features/marketing/security-section";
import { AudienceSection } from "@/features/marketing/audience-section";
import { WaitlistSection } from "@/features/marketing/waitlist-section";
import { FinalCTA } from "@/features/marketing/final-cta";
import { Footer } from "@/features/marketing/footer";

export const metadata = publicPageMetadata(
  "Alymero — CRM, devis et facturation pour PME en Côte d’Ivoire",
  "Gérez clients, devis, contrats, factures et projets avec Alymero, votre logiciel de gestion commerciale en français pour indépendants, agences et PME.",
  "/",
);

export default function Home() {

  return (
    <MotionPreferencesProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        "@context": "https://schema.org", "@graph": [
          { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: BRAND_NAME, url: SITE_URL, logo: `${SITE_URL}/brand/alymero-mark.png`, description: BRAND_DESCRIPTION },
          { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: BRAND_NAME, url: SITE_URL, inLanguage: "fr", publisher: { "@id": `${SITE_URL}/#organization` } },
        ],
      }) }} />
      <BrandFlowPath />
      <Header />
      <main className="relative">
        <HeroOrchestration />
        <ProblemFragmentation />
        <JourneyTimeline />
        <FeatureBento />
        <DashboardDemo />
        <ClientPortalDemo />
        <SecuritySection />
        <AudienceSection />
        <SolutionsSection />
        <WaitlistSection />
        <FinalCTA />
      </main>
      <Footer />
      <MotionToggleButton />
    </MotionPreferencesProvider>
  );
}
