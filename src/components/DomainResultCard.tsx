"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  Crown,
  HelpCircle,
  Lock,
  RotateCw,
  ShoppingCart,
  WifiOff,
  X,
} from "lucide-react";

import { createCheckoutUrl } from "@/lib/domain/checkout-url";
import { splitDomain } from "@/lib/domain/split-domain";
import type { CheckDomainResponse, DomainStatus } from "@/lib/domain/types";
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
const IS_DEV = process.env.NODE_ENV !== "production";

interface StatusVisual {
  card: string;
  iconBox: string;
  icon: ReactNode;
  titleClass: string;
  textClass: string;
}

const STATUS_VISUALS: Record<DomainStatus, StatusVisual> = {
  available: {
    card: "border-[oklch(85%_0.08_158)] bg-success-soft",
    iconBox: "bg-success text-white shadow-[0_8px_20px_oklch(58%_0.14_158/0.35)]",
    icon: <Check className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-success-ink",
    textClass: "text-success-ink",
  },
  premium: {
    card: "border-[oklch(84%_0.06_300)] bg-primary-tint",
    iconBox:
      "bg-gradient-to-br from-primary to-primary-700 text-white shadow-[0_8px_20px_oklch(48%_0.17_295/0.3)]",
    icon: <Crown className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-primary-700",
    textClass: "text-ink-700",
  },
  registered: {
    card: "border-[oklch(87%_0.07_55)] bg-warn-soft",
    iconBox: "bg-warn text-white shadow-[0_8px_20px_oklch(64%_0.16_45/0.32)]",
    icon: <X className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-warn-ink",
    textClass: "text-warn-ink",
  },
  reserved: {
    card: "border-line-strong bg-paper-soft",
    iconBox: "bg-ink-400 text-white",
    icon: <Lock className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-ink-900",
    textClass: "text-ink-500",
  },
  unsupported: {
    card: "border-line-strong bg-paper-soft",
    iconBox: "bg-ink-400 text-white",
    icon: <Ban className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-ink-900",
    textClass: "text-ink-500",
  },
  invalid: {
    card: "border-[oklch(88%_0.06_22)] bg-danger-soft",
    iconBox: "bg-danger text-white",
    icon: <AlertTriangle className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-[oklch(42%_0.14_22)]",
    textClass: "text-[oklch(45%_0.12_22)]",
  },
  unknown: {
    // Neutral — never a red/alarming "registered" look.
    card: "border-line-strong bg-paper-soft",
    iconBox: "bg-ink-400 text-white",
    icon: <HelpCircle className="h-6 w-6" aria-hidden="true" />,
    titleClass: "text-ink-900",
    textClass: "text-ink-500",
  },
};

function subLine(data: CheckDomainResponse): string {
  switch (data.status) {
    case "available":
      return `${data.domain} is ready to register.`;
    case "premium":
      return `${data.domain} — premium pricing applies at checkout.`;
    case "registered":
      return "Try one of these available alternatives with the same extension.";
    case "unsupported":
      return "We can't check this extension yet — try a different TLD.";
    default:
      return data.domain;
  }
}

function DevDebug({ source, confidence }: { source: string; confidence: string }) {
  if (!IS_DEV) return null;
  const fake = source.includes("mock");
  return (
    <p className="mt-3 font-mono text-[0.72rem] text-ink-400">
      Source: {source} · Confidence: {confidence}
      {fake ? " · Fake result" : ""}
    </p>
  );
}

export function DomainResultCard({
  state,
  onTryAgain,
}: {
  state: SearchState;
  onTryAgain: (domain: string) => void;
}) {
  if (state.kind === "idle") return null;

  if (state.kind === "loading") {
    return (
      <div className="flex animate-rise items-center gap-4 rounded-lg border border-line bg-surface p-6 shadow-md">
        <span
          className="h-[26px] w-[26px] shrink-0 animate-spin rounded-full border-[3px] border-primary-soft border-t-primary"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-ink-700">Checking {state.domain}…</p>
          <p className="font-mono text-[0.86rem] text-ink-400">
            checking availability
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "invalid" || state.kind === "error") {
    const isInvalid = state.kind === "invalid";
    return (
      <div className="animate-rise rounded-lg border border-[oklch(88%_0.06_22)] bg-danger-soft p-6">
        <div className="flex items-start gap-4">
          <div className={cn(ICON_BOX, "bg-danger text-white")}>
            {isInvalid ? (
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            ) : (
              <WifiOff className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-[1.4rem] font-semibold leading-tight text-[oklch(42%_0.14_22)]">
              {isInvalid ? "Invalid domain" : "Something went wrong"}
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
  const visual = STATUS_VISUALS[data.status] ?? STATUS_VISUALS.unknown;
  const canCheckout =
    (data.status === "available" || data.status === "premium") &&
    Boolean(data.checkoutUrl);
  const { tld } = splitDomain(data.domain);
  const availableCount = data.suggestions.filter((s) => s.available).length;

  return (
    <div>
      <div className={cn("animate-rise rounded-lg border p-6", visual.card)}>
        <div className="flex items-start gap-4">
          <div className={cn(ICON_BOX, visual.iconBox)}>{visual.icon}</div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-display text-[1.4rem] font-semibold leading-tight",
                visual.titleClass,
              )}
            >
              {data.message}
            </p>
            <p className={cn("mt-1 break-words", visual.textClass)}>
              {subLine(data)}
            </p>

            {canCheckout && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href={data.checkoutUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: data.status === "premium" ? "primary" : "success",
                    size: "lg",
                  })}
                >
                  <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
                  {data.status === "premium"
                    ? "Check premium price at checkout"
                    : "Continue to Checkout"}
                </a>
                <span
                  className={cn("text-[0.88rem] font-semibold", visual.textClass)}
                >
                  <b className="font-mono">{data.domain}</b> pre-filled
                </span>
              </div>
            )}

            {data.status === "unknown" && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onTryAgain(data.domain)}
                  className={buttonVariants({ variant: "soft", size: "sm" })}
                >
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
                <a
                  href={createCheckoutUrl(data.domain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Check directly at checkout
                </a>
              </div>
            )}

            <DevDebug source={data.source} confidence={data.confidence} />
          </div>
        </div>
      </div>

      {data.status === "registered" && data.suggestions.length > 0 && (
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
