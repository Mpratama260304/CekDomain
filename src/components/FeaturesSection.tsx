import {
  Link2,
  Rocket,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Instant Domain Check",
    description:
      "Type a name and get a clear yes or no in a heartbeat — no refreshes, no clutter.",
    featured: true,
  },
  {
    icon: Sparkles,
    title: "Smart Name Suggestions",
    description:
      "Taken? We generate readable, brandable alternatives that are actually available.",
  },
  {
    icon: Link2,
    title: "Same Extension Suggestions",
    description:
      "Search a .com, get .com ideas. Your TLD stays consistent across every suggestion.",
  },
  {
    icon: Rocket,
    title: "Fast Checkout Redirect",
    description:
      "One tap sends you straight to registration with your domain already pre-filled.",
  },
  {
    icon: ServerCog,
    title: "Server-Side Lookup",
    description:
      "Availability is checked on the server via RDAP — API keys never touch the browser.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Input Validation",
    description:
      "Every domain is sanitized, normalized, and validated before it is ever looked up.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative z-[2] px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-primary-600">
            Everything you need
          </span>
          <h2 className="mt-3.5 font-display text-[clamp(2rem,4vw,2.9rem)] font-semibold tracking-[-0.025em]">
            Built for a fast, confident domain hunt
          </h2>
          <p className="mt-3.5 text-[1.08rem] text-ink-500">
            From the first keystroke to checkout, every step is designed to feel
            instant and trustworthy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  "relative overflow-hidden rounded-lg border p-7 shadow-sm transition-all duration-300 ease-out-quint hover:-translate-y-1 hover:shadow-md",
                  feature.featured
                    ? "border-transparent bg-gradient-to-br from-primary to-primary-700 text-white shadow-glow"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <div
                  className={cn(
                    "mb-4 grid h-[46px] w-[46px] place-items-center rounded-[13px]",
                    feature.featured
                      ? "bg-white/15 text-white"
                      : "bg-primary-tint text-primary-600",
                  )}
                >
                  <Icon className="h-[23px] w-[23px]" aria-hidden="true" />
                </div>
                <h3
                  className={cn(
                    "font-display text-[1.25rem] font-semibold",
                    feature.featured && "text-white",
                  )}
                >
                  {feature.title}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-[0.96rem]",
                    feature.featured ? "text-white/85" : "text-ink-500",
                  )}
                >
                  {feature.description}
                </p>

                {feature.featured && (
                  <div className="mt-5 rounded-xl border border-white/20 bg-white/10 p-3.5 font-mono text-[0.85rem]">
                    <div>&gt; check cekdomain.ink</div>
                    <div className="text-[oklch(90%_0.12_158)]">
                      ✓ available · ready to register
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
