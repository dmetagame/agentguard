import LenisProvider from "@/components/landing/LenisProvider";
import LandingHeader from "@/components/landing/LandingHeader";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import Verdicts from "@/components/landing/Verdicts";
import HowItWorks from "@/components/landing/HowItWorks";
import Policy from "@/components/landing/Policy";
import SpecCard from "@/components/landing/SpecCard";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <>
      <LenisProvider />
      <LandingHeader />
      <main>
        <Hero />
        <Problem />
        <Verdicts />
        <HowItWorks />
        <Policy />
        <SpecCard />
      </main>
      <LandingFooter />
    </>
  );
}
