"use client";

import { useCallback, useRef, useState } from "react";

import { normalizeDomain } from "@/lib/domain/normalize-domain";
import { toRegistrableDomain } from "@/lib/domain/split-domain";
import { validateDomain } from "@/lib/domain/validate-domain";
import type { CheckDomainResponse } from "@/lib/domain/types";

import { DomainResultCard, type SearchState } from "./DomainResultCard";
import { DomainSearchForm } from "./DomainSearchForm";

const EXAMPLE_CHIPS = ["bisnisku.com", "tokoonline.com", "branddigital.com"];
const FALLBACK_INVALID = "Please enter a valid domain, for example mantapnyoo.com";

export function HeroSearch() {
  const [inputValue, setInputValue] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });

  // Race protection: the latest request wins. `requestIdRef` invalidates stale
  // responses; `abortRef` cancels the previous in-flight fetch outright.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const runCheck = useCallback(async (rawValue: string) => {
    const normalized = normalizeDomain(rawValue);

    // Immediately cancel any previous in-flight request so its response can
    // never overwrite this one.
    abortRef.current?.abort();

    // Validate on the client first so we never show a stale valid result.
    const validation = validateDomain(normalized);
    if (!validation.ok) {
      setInputValue(normalized);
      requestIdRef.current += 1; // invalidate anything still in flight
      setState({ kind: "invalid", message: validation.error ?? FALLBACK_INVALID });
      return;
    }

    // Reduce to the registrable domain so subdomains (sub.example.com) become
    // example.com. The input is the single source of truth — reflect it.
    const domain = toRegistrableDomain(normalized);
    setInputValue(domain);

    const myId = (requestIdRef.current += 1);
    const controller = new AbortController();
    abortRef.current = controller;

    // Fresh loading state for THIS domain — clears previous result/suggestions.
    setState({ kind: "loading", domain });
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    try {
      const res = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
        signal: controller.signal,
      });

      if (myId !== requestIdRef.current) return; // superseded

      const payload: unknown = await res.json().catch(() => null);
      if (myId !== requestIdRef.current) return; // superseded

      if (!res.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Something went wrong. Please try again.";
        setState({
          kind: res.status === 400 ? "invalid" : "error",
          message,
        });
        return;
      }

      setState({ kind: "result", data: payload as CheckDomainResponse });
    } catch {
      if (controller.signal.aborted) return; // replaced by a newer search
      if (myId !== requestIdRef.current) return;
      setState({
        kind: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }, []);

  return (
    <section id="home" className="relative z-[2] px-5 pb-10 pt-16 text-center sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <span className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-3.5 pr-2 text-[0.82rem] font-semibold text-ink-700 shadow-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_0_4px_oklch(95%_0.045_158)]" />
          Live domain lookup
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.76rem] font-bold text-primary-700">
            .com .net .id .ink
          </span>
        </span>

        <h1 className="mx-auto max-w-[16ch] font-display text-[clamp(2.5rem,6.2vw,4.6rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
          Find your{" "}
          <em className="font-medium italic text-primary [background:linear-gradient(oklch(70%_0.15_295/0.35),oklch(70%_0.15_295/0.35))_no-repeat_left_bottom/100%_0.12em]">
            perfect
          </em>{" "}
          domain name instantly
        </h1>

        <p className="mx-auto mt-5 max-w-[56ch] text-[clamp(1.05rem,2.2vw,1.28rem)] font-normal text-ink-500">
          Check domain availability, discover smart alternatives, and continue
          registration in seconds.
        </p>

        <div
          id="search"
          className="relative z-[2] mx-auto mt-9 max-w-[720px] scroll-mt-28"
        >
          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-lg transition-all duration-300 ease-out-quint focus-within:border-[oklch(70%_0.14_295)] focus-within:shadow-[0_24px_60px_oklch(30%_0.06_300/0.14),0_0_0_4px_oklch(94%_0.03_295)]">
            <DomainSearchForm
              value={inputValue}
              onChange={setInputValue}
              onSubmit={() => runCheck(inputValue)}
              isLoading={state.kind === "loading"}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <span className="text-[0.85rem] font-semibold text-ink-400">
              Try:
            </span>
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => runCheck(chip)}
                className="rounded-full border border-line bg-surface px-3.5 py-[7px] font-mono text-[0.84rem] font-medium text-ink-700 transition-all duration-200 ease-out-quint hover:-translate-y-px hover:border-[oklch(78%_0.1_295)] hover:bg-primary-tint hover:text-primary-700"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={resultRef}
          aria-live="polite"
          className="relative z-[2] mx-auto mt-5 min-h-[4px] max-w-[720px] scroll-mt-28 text-left"
        >
          <DomainResultCard state={state} onTryAgain={runCheck} />
        </div>
      </div>
    </section>
  );
}
