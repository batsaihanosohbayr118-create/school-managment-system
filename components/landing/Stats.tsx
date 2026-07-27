"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import type { LandingDict, StatCard } from "./types";

interface StatsProps {
  dict: LandingDict;
}

function StatTile({ stat, index }: { stat: StatCard; index: number }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className="rounded-3xl bg-white p-6 text-center shadow-[0_16px_40px_rgba(2,6,23,0.12)] ring-1 ring-slate-100"
    >
      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br ${stat.chip} text-white shadow-lg`}>
        <Icon size={26} />
      </span>
      <p className="mt-4 text-[2rem] font-black leading-none text-[#0F172A]">
        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
      </p>
      <p className="mt-2 text-[13px] font-semibold text-[#64748B]">{stat.label}</p>
    </motion.div>
  );
}

export function Stats({ dict }: StatsProps) {
  const { why } = dict;
  return (
    <section id="about" className="relative mx-auto w-full max-w-7xl px-5 py-16 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.5rem] bg-linear-to-br from-[#ecfdf3] via-[#eff6ff] to-[#eef2ff] p-8 shadow-[0_30px_70px_rgba(2,6,23,0.4)] ring-1 ring-white/60 sm:p-10 lg:p-12"
      >
        {/* soft decorative glows */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#38bdf8]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-56 w-56 rounded-full bg-[#a78bfa]/15 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-white/80 px-4 py-1.5 text-[12px] font-bold text-[#15803d] shadow-sm">
              {why.eyebrow}
            </span>
            <h2 className="mt-5 text-[clamp(2rem,4vw,2.9rem)] font-black tracking-tight text-[#0F172A]">
              Nova Mind <span className="text-[#2563EB]">Academy</span>
            </h2>
            <p className="mt-4 max-w-lg text-[1.02rem] leading-relaxed text-[#475569]">{why.description}</p>
            <Link
              href="/login"
              className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#10b981] to-[#059669] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_30px_rgba(16,185,129,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(16,185,129,0.5)]"
            >
              {why.cta}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right: 2x2 stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {why.stats.map((stat, i) => (
              <StatTile key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
