import { Search } from "lucide-react";

import { FAQSection } from "@/components/FAQSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HeroSearch } from "@/components/HeroSearch";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main>
      <HeroSearch />
      <FeaturesSection />
      <HowItWorksSection />
      <FAQSection />

      {/* Closing call to action */}
      <div className="relative z-[2] mx-auto max-w-[1180px] px-5 py-5 sm:px-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-ink-900 to-[oklch(30%_0.06_295)] px-7 py-16 text-center shadow-lg sm:px-12">
          <div
            className="pointer-events-none absolute -right-20 -top-40 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,oklch(60%_0.18_295/0.55),transparent_70%)] blur-[30px]"
            aria-hidden="true"
          />
          <h2 className="relative font-display text-[clamp(1.9rem,3.6vw,2.7rem)] font-semibold text-[oklch(98%_0.01_300)]">
            Your domain is one search away
          </h2>
          <p className="relative mx-auto mt-3.5 max-w-[48ch] text-[oklch(80%_0.02_300)]">
            Check availability, explore alternatives, and register in seconds.
          </p>
          <a
            href="#search"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "relative mt-7")}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            Check a domain now
          </a>
        </div>
      </div>
    </main>
  );
}
