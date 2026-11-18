"use client";

import { ShieldCheck } from "lucide-react";

interface SecureBadgeProps {
  label?: string;
}

/** Small glassy "secure" pill shown at the top of the login card. */
export function SecureBadge({ label = "100% Аюулгүй" }: SecureBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur">
      <ShieldCheck size={14} className="text-emerald-300" />
      {label}
    </span>
  );
}
