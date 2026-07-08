"use client";

import {
  AlertTriangle,
  Check,
  HelpCircle,
  ShoppingCart,
  WifiOff,
  X,
} from "lucide-react";

import { splitDomain } from "@/lib/domain/split-domain";
import type { CheckDomainResponse } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { Badge } from "./ui/Badge";
import { buttonVariants } from "./ui/Button";
import { DomainSuggestionCard } from "./DomainSuggestionCard";

/**
 * The single source of truth for what the result area shows. Each search
 * replaces this whole value atomically, which makes stale results impossible —
 * a `result` always carries its own `data.domain`.
 */
export type SearchState =
  | { kind: "idle" }
  | { kind: "loading"; domain: string }
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "result"; data: CheckDomainResponse };

const ICON_BOX = "grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px]";

export interface DomainResultCardProps {
  state: SearchState;
  onTryAgain: (domain: string) => void;
}

export function DomainResultCard({ state, onTryAgain }: DomainResultCardProps) {
  if (state.kind === "idle") return null;

  if (state.kind === "loading") {
    return (
      <div className="flex animate-rise items-center gap-4 rounded-lg border border-line bg-surface p-6 shadow-md">
        <span
          className="h-[26px] w-[26px] shrink-0 animate-spin rounded-full border-[3px] border-primary-soft border-t-primary"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-ink-700">
            Checking {state.domain}…
          </p>
          <p className="font-mono text-[0.86rem] text-ink-400">
            looking up registry records
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div className="animate-rise rounded-lg border border-[oklch(88%_0.06_22)] bg-danger-soft p-6">
        <div className="flex items-start gap-4">
          <div className={cn(ICON_BOX, "bg-danger text-white")}>
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[1.4rem] font-semibold leading-tight text-[oklch(42%_0.14_22)]">
              Invalid domain
            </p>
            <p className="mt-1 font-medium text-[oklch(45%_0.12_22)]">
              {state.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="animate-rise rounded-lg border border-[oklch(88%_0.06_22)] bg-danger-soft p-6">
        <div className="flex items-start gap-4">
          <div className={cn(ICON_BOX, "bg-danger text-white")}>
            <WifiOff className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[1.4rem] font-semibold leading-tight text-[oklch(42%_0.14_22)]">
              Something went wrong
            </p>
            <p className="mt-1 font-medium text-[oklch(45%_0.12_22)]">
              {state.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // state.kind === "result"
  const { data } = state;

  if (data.available) {
    return (
      <div className="animate-rise rounded-lg border border-[oklch(85%_0.08_158)] bg-success-soft p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              ICON_BOX,
              "bg-success text-white shadow-[0_8px_20px_oklch(58%_0.14_158/0.35)]",
            )}
          >
            <Check className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.4rem] font-semibold leading-tight text-success-ink">
              Great news! This domain is available.
            </p>
            <p className="mt-1 text-success-ink">
              <b className="break-all font-mono font-semibold">{data.domain}</b>{" "}
              is ready to register.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {data.checkoutUrl && (
                <a
                  href={data.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "success", size: "lg" })}
                >
                  <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
                  Continue to Checkout
                </a>
              )}
              <span className="text-[0.88rem] font-semibold text-success-ink">
                Registration ready ·{" "}
                <b className="font-mono">{data.domain}</b> pre-filled
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // registered or unknown
  const isUnknown = data.status === "unknown";
  const { tld } = splitDomain(data.domain);
  const availableCount = data.suggestions.filter((s) => s.available).length;

  return (
    <div>
      <div
        className={cn(
          "animate-rise rounded-lg border p-6",
          isUnknown
            ? "border-line-strong bg-paper-soft"
            : "border-[oklch(87%_0.07_55)] bg-warn-soft",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              ICON_BOX,
              isUnknown
                ? "bg-ink-400 text-white"
                : "bg-warn text-white shadow-[0_8px_20px_oklch(64%_0.16_45/0.32)]",
            )}
          >
            {isUnknown ? (
              <HelpCircle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <X className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-display text-[1.4rem] font-semibold leading-tight",
                isUnknown ? "text-ink-900" : "text-warn-ink",
              )}
            >
              {isUnknown
                ? "We couldn't confirm this domain."
                : "This domain is already registered."}
            </p>
            <p
              className={cn(
                "mt-1",
                isUnknown ? "text-ink-500" : "text-warn-ink",
              )}
            >
              {data.message}
            </p>
          </div>
        </div>
      </div>

      {data.suggestions.length > 0 && (
        <div className="mt-6 animate-rise">
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5 px-1">
            <h3 className="font-display text-[1.15rem] font-semibold">
              Smart alternatives
            </h3>
            <Badge>
              {availableCount} available · same .{tld}
            </Badge>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {data.suggestions.map((suggestion, index) => (
              <DomainSuggestionCard
                key={suggestion.domain}
                suggestion={suggestion}
                index={index}
                onTryAgain={onTryAgain}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
