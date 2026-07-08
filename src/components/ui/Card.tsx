import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Base surface card: white background, subtle border + shadow, rounded corners.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
