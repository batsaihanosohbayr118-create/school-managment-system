"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";
import type { LandingDict } from "./types";

interface CTAProps {
  dict: LandingDict;
}

const STARS = [
  { top: "18%", left: "12%", size: 3 },
  { top: "32%", left: "26%", size: 2 },
  { top: "22%", left: "68%", size: 4 },
  { top: "60%", left: "16%", size: 2 },
  { top: "70%", left: "40%", size: 3 },
  { top: "40%", left: "84%", size: 2 },
  { top: "76%", left: "72%", size: 3 },
  { top: "14%", left: "48%", size: 2 }
];

export function CTA({ dict }: CTAProps) {
  const { cta } = dict;
  return (
    <section className="relative mx-auto w-full max-w-7xl px-5 pb-24 pt-8 sm:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(120%_120%_at_0%_0%,#1e3a8a_0%,#111c44_45%,#0b1226_100%)] px-6 py-14 shadow-[0_30px_80px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:px-14"
      >
        {/* Stars */}
        {STARS.map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/70"
            style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
          />
        ))}
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-[#38BDF8]/20 blur-3xl" />

        <div className="relative flex flex-col items-center gap-8 md:flex-row md:justify-between md:gap-10">
          <motion.span
            animate={{ y: [0, -12, 0], rotate: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-linear-to-br from-[#6366f1] to-[#38bdf8] text-white shadow-[0_18px_40px_rgba(56,189,248,0.5)]"
          >
            <Rocket size={44} />
          </motion.span>

          <div className="text-center md:flex-1">
            <h2 className="text-[clamp(1.7rem,3.6vw,2.6rem)] font-black leading-tight text-white">
              {cta.title}{" "}
              <span className="bg-linear-to-r from-[#7dd3fc] to-[#a78bfa] bg-clip-text text-transparent">{cta.highlight}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[1.02rem] text-slate-300">{cta.subtitle}</p>
          </div>

          <Link
            href="/login"
            className="group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-linear-to-r from-[#f59e0b] to-[#f97316] px-7 py-4 text-[15px] font-bold text-white shadow-[0_16px_34px_rgba(249,115,22,0.45)] transition hover:-translate-y-0.5"
          >
            {cta.button}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
