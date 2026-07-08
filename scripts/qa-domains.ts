/**
 * QA script: `npm run qa:domains`
 *
 * Checks a small list of domains through the CURRENTLY CONFIGURED provider and
 * prints domain / status / source / confidence / reason so you can instantly
 * spot a wrong provider (e.g. fake mock results).
 *
 * It loads env from .env.local (then .env) so it mirrors `npm run dev`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- minimal .env loader (no dependency) -------------------------------------
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const DOMAINS = [
  "bisnisku.co",
  "google.com",
  "example.com",
  "mantapnyoo.com",
  "branddigital.com",
];

async function main() {
  const { getAvailabilityProvider, describeActiveProvider, ProviderConfigError } =
    await import("../src/lib/domain/availability-provider");
  const { normalizeDomain } = await import("../src/lib/domain/normalize-domain");
  const { toRegistrableDomain } = await import("../src/lib/domain/split-domain");

  console.log(
    `\nCekDomain QA — provider: ${describeActiveProvider()}  (NODE_ENV=${process.env.NODE_ENV ?? "development"})\n`,
  );

  let provider;
  try {
    provider = getAvailabilityProvider();
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      console.error(`Provider not usable: ${error.message}`);
      console.error(
        "Configure a registrar provider (or set ALLOW_RDAP_ONLY_PRODUCTION / ALLOW_MOCK_PROVIDER for non-registrar modes).",
      );
      process.exit(1);
    }
    throw error;
  }

  for (const raw of DOMAINS) {
    const domain = toRegistrableDomain(normalizeDomain(raw));
    try {
      const r = await provider.check(domain);
      console.log(
        `${domain.padEnd(22)} status=${r.status.padEnd(11)} source=${r.source.padEnd(16)} confidence=${r.confidence.padEnd(13)} ${r.reason ?? ""}`,
      );
    } catch (error) {
      console.log(`${domain.padEnd(22)} ERROR ${(error as Error).message}`);
    }
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
