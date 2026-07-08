"use client";

import { useState } from "react";
import { Feather, Menu, Search, X } from "lucide-react";

import { buttonVariants } from "./ui/Button";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#how", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
        <nav
          aria-label="Primary"
          className="mt-3.5 flex items-center justify-between gap-6 rounded-full border border-white/60 bg-[oklch(100%_0_0/0.72)] py-2.5 pl-5 pr-2.5 shadow-sm backdrop-blur-lg backdrop-saturate-150"
        >
          <a
            href="#home"
            className="flex items-center gap-2.5 font-display text-[1.28rem] font-semibold tracking-[-0.02em]"
          >
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-gradient-to-br from-primary to-primary-700 text-white shadow-sm">
              <Feather className="h-[19px] w-[19px]" aria-hidden="true" />
            </span>
            CekDomain<span className="text-primary">.ink</span>
          </a>

          <div className="hidden items-center gap-1.5 md:flex">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-[0.94rem] font-semibold text-ink-700 transition-colors duration-200 hover:bg-primary-tint hover:text-ink-900"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-900 transition-colors hover:bg-primary-tint md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <a href="#search" className={buttonVariants({ variant: "primary", size: "md" })}>
              <Search className="h-[17px] w-[17px]" aria-hidden="true" />
              Check Domain
            </a>
          </div>
        </nav>

        {menuOpen && (
          <div className="mt-2 rounded-2xl border border-line bg-surface p-2 shadow-md md:hidden">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-[0.98rem] font-semibold text-ink-700 transition-colors hover:bg-primary-tint hover:text-ink-900"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
