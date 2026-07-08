import Link from "next/link";
import { ArrowLeft, Compass, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";

const SUGGESTIONS = ["bisnisku.com", "tokoonline.com", "branddigital.com"];

export default function NotFound() {
  return (
    <main className="relative z-[2] flex min-h-[72vh] items-center justify-center px-5 py-20 sm:px-6">
      <div className="mx-auto w-full max-w-[600px] text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-primary-600 shadow-sm">
          <Compass className="h-4 w-4" aria-hidden="true" />
          Error 404
        </span>

        <div className="mt-6 select-none font-display text-[clamp(5.5rem,20vw,10rem)] font-semibold leading-none tracking-[-0.04em]">
          <span className="bg-gradient-to-br from-primary to-primary-700 bg-clip-text text-transparent">
            404
          </span>
        </div>

        <h1 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] font-semibold">
          This page could not be found
        </h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-[1.02rem] text-ink-500">
          {"The page you're looking for doesn't exist or may have moved. Let's get you back to finding your perfect domain."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary", size: "lg" })}>
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            Back to home
          </Link>
          <Link
            href="/#search"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            Check a domain
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-[0.85rem] font-semibold text-ink-400">
            Popular searches:
          </span>
          {SUGGESTIONS.map((domain) => (
            <Link
              key={domain}
              href="/#search"
              className="rounded-full border border-line bg-surface px-3.5 py-[7px] font-mono text-[0.84rem] font-medium text-ink-700 transition-all duration-200 ease-out-quint hover:-translate-y-px hover:border-[oklch(78%_0.1_295)] hover:bg-primary-tint hover:text-primary-700"
            >
              {domain}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
