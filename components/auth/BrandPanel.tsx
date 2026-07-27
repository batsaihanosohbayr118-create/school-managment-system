"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const BRAND = {
  name: "Nova Mind",
  suffix: "Academy",
  logo: "/logo-mark.png",
  background: "/background3.png"
} as const;

/** Left branding panel (desktop only) — background illustration with overlaid copy. */
export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col">
      {/* Background illustration */}
      <Image
        src={BRAND.background}
        alt="Nova Mind Academy learning illustration"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 0px"
        className="object-cover object-bottom"
      />
      {/* Readability overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(12,8,34,0.9)_0%,rgba(18,13,48,0.6)_42%,rgba(10,8,28,0.35)_100%)]" />

      <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <Image src={BRAND.logo} alt={BRAND.name} width={544} height={420} className="h-7 w-auto object-contain" priority />
          </span>
          <span className="leading-tight">
            <strong className="block text-[18px] font-extrabold text-white">{BRAND.name}</strong>
            <small className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{BRAND.suffix}</small>
          </span>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-14"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-semibold text-amber-200 backdrop-blur">
            <Star size={14} className="fill-amber-300 text-amber-300" />
            8 төрлийн хосолсон хөтөлбөр
          </span>

          <h1 className="mt-6 text-[clamp(2.6rem,4vw,3.6rem)] font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)]">
            <span className="block">Сур.</span>
            <span className="block">Илэрхийл.</span>
            <span className="block bg-[linear-gradient(90deg,#38bdf8,#a78bfa,#e879f9)] bg-clip-text text-transparent">
              Нөлөөл!
            </span>
          </h1>

          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-white/75 drop-shadow-[0_1px_10px_rgba(0,0,0,0.4)]">
            Ирээдүйн амжилтаа эндээс эхлүүл. Мэдлэг, ур чадвараа шинэ түвшинд хүргэх аялалдаа нэвтэрнэ үү.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
