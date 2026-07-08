const STEPS = [
  {
    title: "Enter your domain",
    description: "Type any name and extension, like tokoku.com or brand.id.",
  },
  {
    title: "Check availability",
    description: "We validate, normalize, and look it up server-side in real time.",
  },
  {
    title: "Choose a domain",
    description: "Grab it if it's free, or pick a smart same-TLD alternative.",
  },
  {
    title: "Continue to checkout",
    description: "Head to registration with your domain already attached.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="relative z-[2] bg-paper-soft px-5 py-20 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-12 max-w-[640px] text-center">
          <span className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-primary-600">
            How it works
          </span>
          <h2 className="mt-3.5 font-display text-[clamp(2rem,4vw,2.9rem)] font-semibold tracking-[-0.025em]">
            Four steps to your domain
          </h2>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative px-2 py-4">
              <div className="font-display text-[2.6rem] font-medium leading-none text-primary/30">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 font-display text-[1.12rem] font-semibold">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[0.94rem] text-ink-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
