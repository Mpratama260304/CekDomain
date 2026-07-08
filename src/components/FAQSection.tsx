import { Plus } from "lucide-react";

const FAQS = [
  {
    question: "What is CekDomain.ink?",
    answer:
      "CekDomain.ink is a modern domain availability checker. Type a domain, find out instantly if it's free or taken, and get brandable alternatives when it's already registered — all in one clean screen.",
  },
  {
    question: "How does the domain checker work?",
    answer:
      "Your input is cleaned and validated, then sent to a server-side API route that checks availability using the RDAP protocol. RDAP is the standardized successor to WHOIS and needs no API keys, so nothing secret is ever exposed to the browser.",
  },
  {
    question: "Are suggestions using the same extension?",
    answer:
      "Always. If you search a .com and it's taken, every suggestion is also a .com. Search a .id and you get .id ideas. The TLD you chose is respected across all suggestions, and available names are surfaced first.",
  },
  {
    question: "What happens after I click checkout?",
    answer:
      "You're redirected to the registration page with your chosen domain passed along as a query parameter, so it's ready to complete without retyping.",
  },
  {
    question: "Does availability guarantee ownership?",
    answer:
      "No. A domain is only yours once registration is fully completed and confirmed by the registrar at checkout. Availability is a strong signal, not a reservation.",
  },
  {
    question: "Why can availability change?",
    answer:
      "Domains are registered by people all over the world every second. A name that reads as available now can be taken moments later, which is why we confirm the final state at checkout.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="relative z-[2] px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-primary-600">
            FAQ
          </span>
          <h2 className="mt-3.5 font-display text-[clamp(2rem,4vw,2.9rem)] font-semibold tracking-[-0.025em]">
            Questions, answered
          </h2>
        </div>

        <div className="mx-auto max-w-[760px]">
          {FAQS.map((faq, index) => (
            <details
              key={faq.question}
              className="group border-b border-line"
              {...(index === 0 ? { open: true } : {})}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 font-display text-[1.18rem] font-medium text-ink-900 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-tint text-primary-600 transition-all duration-300 ease-out-quint group-open:rotate-45 group-open:bg-primary group-open:text-white">
                  <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-[68ch] px-1 pb-6 text-ink-500">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
