import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "ghost" | "success" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap " +
  "transition-all duration-200 ease-out-quint focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-700 text-white shadow-glow hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "bg-transparent text-ink-700 border border-line-strong hover:bg-surface hover:text-ink-900 hover:border-ink-400",
  success:
    "bg-gradient-to-br from-success to-[oklch(50%_0.13_158)] text-white shadow-[0_14px_34px_oklch(58%_0.14_158/0.32)] hover:-translate-y-0.5 active:translate-y-0",
  soft:
    "bg-primary-tint text-primary-700 border border-primary-soft hover:bg-primary hover:text-white hover:border-primary",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-[0.94rem]",
  lg: "px-6 py-4 text-base",
};

export function buttonVariants(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const { variant = "primary", size = "md", className } = options ?? {};
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
