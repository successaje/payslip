import { Nav } from "@/components/landing/Nav";
import { BuiltOn, Closing, Footer, Hero, HowItWorks, Problem, Roles } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Roles />
        <BuiltOn />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
