import type { DomainAvailabilityProvider } from "../types";
import { GenericRegistrarProvider } from "./generic-provider";
import { GodaddyProvider } from "./godaddy-provider";
import { NamecomProvider } from "./namecom-provider";

/**
 * Registrar dispatcher — selects the concrete registrar adapter based on
 * `REGISTRAR_API_PROVIDER` (namecom | godaddy | generic). This is the PRIMARY,
 * authoritative availability source for production.
 */

export type RegistrarKind = "generic" | "namecom" | "godaddy";

export function getRegistrarKind(): RegistrarKind {
  const kind = (process.env.REGISTRAR_API_PROVIDER ?? "generic")
    .trim()
    .toLowerCase();
  if (kind === "namecom" || kind === "godaddy" || kind === "generic") {
    return kind;
  }
  return "generic";
}

/** True when the selected registrar adapter has the credentials it needs. */
export function isRegistrarConfigured(): boolean {
  switch (getRegistrarKind()) {
    case "namecom":
      return NamecomProvider.isConfigured();
    case "godaddy":
      return GodaddyProvider.isConfigured();
    case "generic":
    default:
      return GenericRegistrarProvider.isConfigured();
  }
}

/**
 * Build the configured registrar adapter, or `null` if credentials are missing.
 * Callers must fail closed on `null` — never silently fall back to mock/RDAP.
 */
export function createRegistrarProvider(): DomainAvailabilityProvider | null {
  switch (getRegistrarKind()) {
    case "namecom":
      return NamecomProvider.isConfigured() ? NamecomProvider.fromEnv() : null;
    case "godaddy":
      return GodaddyProvider.isConfigured() ? GodaddyProvider.fromEnv() : null;
    case "generic":
    default:
      return GenericRegistrarProvider.isConfigured()
        ? GenericRegistrarProvider.fromEnv()
        : null;
  }
}
