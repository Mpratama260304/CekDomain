import type { HTMLAttributes } from "react";

import type { DomainStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Generic soft pill badge (e.g. counts, labels). */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-700",
        className,
      )}
      {...props}
    />
  );
}

const statusText: Record<DomainStatus, string> = {
  available: "Available",
  registered: "Registered",
  unknown: "Unknown",
};

const statusColor: Record<DomainStatus, string> = {
  available: "text-success-ink",
  registered: "text-ink-400",
  unknown: "text-ink-400",
};

const dotColor: Record<DomainStatus, string> = {
  available: "bg-success",
  registered: "bg-[oklch(70%_0.02_300)]",
  unknown: "bg-ink-400",
};

/** Availability status indicator with a colored dot. */
export function StatusBadge({
  status,
  className,
}: {
  status: DomainStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.76rem] font-semibold",
        statusColor[status],
        className,
      )}
    >
      <span className={cn("h-[7px] w-[7px] rounded-full", dotColor[status])} />
      {statusText[status]}
    </span>
  );
}
