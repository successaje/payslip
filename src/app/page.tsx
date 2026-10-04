import { Nav } from "@/components/landing/Nav";
import { BuiltOn, Closing, Footer, Hero, HowItWorks, Problem, Roles } from "@/components/landing/Sections";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { Evidence } from "@/components/landing/Evidence";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <StatsStrip />
        <Problem />
        <HowItWorks />
        <Evidence />
        <Roles />
        <BuiltOn />
        <Pricing />
        <FAQ />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
