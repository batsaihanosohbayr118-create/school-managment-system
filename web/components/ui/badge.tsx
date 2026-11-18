import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return <span className={cn("ec-badge", `ec-badge-${tone}`, className)} {...props} />;
}
