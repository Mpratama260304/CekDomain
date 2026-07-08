"use client";

import { Globe, ScanSearch } from "lucide-react";

import { Button } from "./ui/Button";

export interface DomainSearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

/**
 * Presentational search row: a controlled domain input + submit button.
 * All state lives in the parent so the input stays the single source of truth.
 */
export function DomainSearchForm({
  value,
  onChange,
  onSubmit,
  isLoading,
}: DomainSearchFormProps) {
  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
    >
      <label className="flex flex-1 items-center gap-3 rounded-full pl-4 pr-1.5 sm:rounded-none sm:pr-0">
        <span className="sr-only">Domain name</span>
        <Globe className="h-[22px] w-[22px] shrink-0 text-ink-400" aria-hidden="true" />
        <input
          id="domainInput"
          name="domain"
          type="text"
          inputMode="url"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Enter a domain name to check"
          placeholder="Enter your domain, e.g. cekdomain.com"
          className="min-w-0 flex-1 border-none bg-transparent py-[18px] font-mono text-[1.12rem] font-medium text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
        />
      </label>
      <Button
        type="submit"
        size="lg"
        disabled={isLoading}
        className="justify-center sm:w-auto"
      >
        <ScanSearch className="h-[18px] w-[18px]" aria-hidden="true" />
        {isLoading ? "Checking…" : "Check Availability"}
      </Button>
    </form>
  );
}
