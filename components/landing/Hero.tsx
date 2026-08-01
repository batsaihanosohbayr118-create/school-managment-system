"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, GraduationCap, Play, Star } from "lucide-react";
import { useSiteReady } from "@/lib/site-ready";
import { BRAND } from "./constants";
import type { LandingDict } from "./types";

interface HeroProps {
  dict: LandingDict;
}

/** Each element lifts and sharpens out of a blur, one after the next. */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }
  })
};

const AVATARS = [
  "linear-gradient(135deg,#60a5fa,#2563eb)",
  "linear-gradient(135deg,#f472b6,#db2777)",
  "linear-gradient(135deg,#fbbf24,#f59e0b)",
  "linear-gradient(135deg,#34d399,#059669)"
];

export function Hero({ dict }: HeroProps) {
  const { hero } = dict;
  const [imageOk, setImageOk] = useState(true);
  // Hold the reveal until the intro overlay is on its way out.
  const ready = useSiteReady();
  const reveal = ready ? "show" : "hidden";

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-[linear-gradient(120deg,#fdf6ec_0%,#fdf5ea_38%,#f3f2ff_66%,#eaf1ff_100%)] pt-17 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:min-h-0"
    >
      {/* Full-bleed background photo (desktop / laptop) — students on the right */}
      {imageOk ? (
        <div className="absolute inset-x-0 bottom-0 top-17 hidden lg:block">
          <Image
            src={BRAND.heroImage}
            alt="Nova Mind Academy students"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[78%_center]"
            onError={() => setImageOk(false)}
          />

        </div>
      ) : null}

      {/* Decorative blur circles */}
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#fde68a]/25 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-[#c4b5fd]/25 blur-[130px]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-6 lg:py-20">
        {/* Left copy */}
        <div className="text-center lg:text-left">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate={reveal}
            custom={0}
            className="inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-[#ecfdf3] px-4 py-2 text-[13px] font-bold text-[#15803d] shadow-sm"
          >
            <Star size={14} className="fill-[#f59e0b] text-[#f59e0b]" />
            {hero.badge}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate={reveal}
            custom={1}
            className="mt-6 text-[clamp(2.6rem,5.6vw,4.4rem)] font-black leading-[1.03] tracking-tight text-[#0F172A]"
          >
            {hero.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="block text-[#2563EB]">{hero.highlight}</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate={reveal}
            custom={2}
            className="mx-auto mt-7 max-w-lg text-[1.05rem] font-medium leading-[1.75] text-[#64748B] lg:mx-0"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={reveal}
            custom={3}
            className="mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start"
          >
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-[#2563EB] to-[#4F46E5] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_16px_34px_rgba(37,99,235,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(37,99,235,0.5)]"
            >
              {hero.primaryCta}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#programs" className="group inline-flex items-center gap-3 text-[15px] font-bold text-[#0F172A]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,0.4)] transition group-hover:scale-105">
                <Play size={16} className="translate-x-px" fill="currentColor" />
              </span>
              {hero.secondaryCta}
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={reveal}
            custom={4}
            className="mt-10 flex items-center justify-center gap-4 lg:justify-start"
          >
            <div className="flex -space-x-3">
              {AVATARS.map((bg, i) => (
                <span
                  key={i}
                  className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-white shadow-md"
                  style={{ background: bg }}
                >
                  <GraduationCap size={17} className="text-white/90" />
                </span>
              ))}
            </div>
            <div className="text-left">
              <p className="text-xl font-black text-[#2563EB]">200+</p>
              <p className="text-[13px] font-medium text-[#64748B]">{hero.activeStudents}</p>
            </div>
          </motion.div>
        </div>

        {/* Right column: photo (mobile/tablet contained; on lg it lives full-bleed in the background) */}
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.96 }}
          animate={ready ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 40, scale: 0.96 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="relative mx-auto h-[340px] w-full max-w-[520px] sm:h-[420px] lg:hidden"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_30px_60px_rgba(37,99,235,0.18)] ring-1 ring-white/60">
            {imageOk ? (
              <Image
                src={BRAND.heroImage}
                alt="Nova Mind Academy students"
                fill
                priority
                sizes="(max-width: 640px) 90vw, 520px"
                className="object-cover object-[70%_center]"
                onError={() => setImageOk(false)}
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[linear-gradient(160deg,#eef4ff,#e0ecff)]">
                <div className="grid h-40 w-40 place-items-center rounded-[2rem] bg-linear-to-br from-[#2563EB] to-[#38BDF8] text-white shadow-2xl">
                  <GraduationCap size={80} strokeWidth={1.4} />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
