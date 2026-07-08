"use client";

import { ShoppingCart } from "lucide-react";

import type { DomainSuggestion } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { StatusBadge } from "./ui/Badge";
import { buttonVariants } from "./ui/Button";

export interface DomainSuggestionCardProps {
  suggestion: DomainSuggestion;
  onTryAgain: (domain: string) => void;
  index?: number;
}

/**
 * One alternative-domain card. Available names get a highlighted checkout link;
 * registered/unknown names get a button that re-runs the search for that exact
 * domain (never the previously searched one).
 */
export function DomainSuggestionCard({
  suggestion,
  onTryAgain,
  index = 0,
}: DomainSuggestionCardProps) {
  const { domain, available, status, checkoutUrl } = suggestion;

  return (
    <div
      style={{ animationDelay: `${index * 55}ms` }}
      className={cn(
        "flex animate-rise flex-col gap-3 rounded-md border p-4 shadow-sm transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:shadow-md",
        available
          ? "border-[oklch(86%_0.07_158)] bg-gradient-to-b from-surface to-[oklch(98%_0.02_158)] hover:border-[oklch(78%_0.1_158)]"
          : "border-line bg-surface hover:border-[oklch(80%_0.09_295)]",
      )}
    >
      <div className="min-w-0">
        <div className="break-all font-mono text-[0.98rem] font-semibold leading-snug text-ink-900">
          {domain}
        </div>
        <StatusBadge status={status} className="mt-1.5" />
      </div>

      {available && checkoutUrl ? (
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "success",
            size: "sm",
            className: "mt-auto w-full",
          })}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Continue to Checkout
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onTryAgain(domain)}
          className={buttonVariants({
            variant: "soft",
            size: "sm",
            className: "mt-auto w-full",
          })}
        >
          {status === "unknown" ? "Check Again" : "Try This Search"}
        </button>
      )}
    </div>
  );
}
