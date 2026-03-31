import { HeroSection } from "@/components/home/hero-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { PredictionPreview } from "@/components/home/prediction-preview";
import { StatsBar } from "@/components/home/stats-bar";
import { CtaSection } from "@/components/home/cta-section";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <HeroSection />
      <HowItWorks />
      <PredictionPreview />
      <StatsBar />
      <CtaSection />
      <Footer />
    </div>
  );
}
