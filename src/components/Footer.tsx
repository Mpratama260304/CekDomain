import { Feather } from "lucide-react";

import { getCheckoutBaseUrl } from "@/lib/domain/checkout-url";

const EXTENSIONS = [".com domains", ".net domains", ".id domains", ".ink domains"];

export function Footer() {
  const registerUrl = getCheckoutBaseUrl();
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-[2] mt-10 border-t border-line px-5 pb-8 pt-14 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <a
              href="#home"
              className="flex items-center gap-2.5 font-display text-[1.28rem] font-semibold tracking-[-0.02em]"
            >
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-primary to-primary-700 text-white shadow-sm">
                <Feather className="h-[19px] w-[19px]" aria-hidden="true" />
              </span>
              CekDomain<span className="text-primary">.ink</span>
            </a>
            <p className="mt-3.5 max-w-[38ch] text-[0.95rem] text-ink-500">
              The fastest way to check domain availability, discover smart
              alternatives, and continue registration in seconds.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-[0.8rem] font-bold uppercase tracking-[0.1em] text-ink-400">
              Product
            </h4>
            <nav className="flex flex-col">
              <a
                href="#features"
                className="py-1.5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:text-primary-700"
              >
                Features
              </a>
              <a
                href="#how"
                className="py-1.5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:text-primary-700"
              >
                How It Works
              </a>
              <a
                href="#faq"
                className="py-1.5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:text-primary-700"
              >
                FAQ
              </a>
              <a
                href={registerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:text-primary-700"
              >
                Register a domain
              </a>
            </nav>
          </div>

          <div>
            <h4 className="mb-4 text-[0.8rem] font-bold uppercase tracking-[0.1em] text-ink-400">
              Extensions
            </h4>
            <nav className="flex flex-col">
              {EXTENSIONS.map((ext) => (
                <a
                  key={ext}
                  href="#search"
                  className="py-1.5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:text-primary-700"
                >
                  {ext}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[0.88rem] text-ink-400">
          <span>&copy; {year} CekDomain.ink. All rights reserved.</span>
          <span>Made for finding great domains, fast.</span>
        </div>
      </div>
    </footer>
  );
}
