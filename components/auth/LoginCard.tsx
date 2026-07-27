"use client";

import { motion } from "framer-motion";
import { useSiteReady } from "@/lib/site-ready";
import { SecureBadge } from "./SecureBadge";
import { LoginForm } from "./LoginForm";

const hidden = { opacity: 0, y: 24, scale: 0.98, filter: "blur(8px)" };

/** Right-side dark glass card containing the secure badge, heading and form. */
export function LoginCard() {
  const ready = useSiteReady();

  return (
    <motion.div
      initial={hidden}
      animate={ready ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : hidden}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md"
    >
      {/* glow behind the card */}
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,58,237,0.35),transparent)] blur-2xl" />

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-7 shadow-[0_30px_80px_rgba(2,6,23,0.6)] backdrop-blur-2xl sm:p-9">
        <SecureBadge />

        <h2 className="mt-6 text-[1.9rem] font-black tracking-tight text-white">Тавтай морил </h2>
        <p className="mt-2 text-[15px] text-slate-400">Nova Mind Academy-д нэвтэрнэ үү.</p>

        <LoginForm />
      </div>
    </motion.div>
  );
}
