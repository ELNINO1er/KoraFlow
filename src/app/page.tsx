import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import {
  MotionPreferencesProvider,
  MotionToggleButton,
} from "@/features/marketing/motion-preferences";
import { KoraFlowPath } from "@/features/marketing/kora-path";
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

export default async function Home() {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");
  if (session.status === "suspended") redirect("/compte-suspendu");

  return (
    <MotionPreferencesProvider>
      <KoraFlowPath />
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
        <WaitlistSection />
        <FinalCTA />
      </main>
      <Footer />
      <MotionToggleButton />
    </MotionPreferencesProvider>
  );
}
