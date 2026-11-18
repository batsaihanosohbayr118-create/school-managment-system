"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { BRAND } from "./constants";
import type { LandingDict, Program } from "./types";

interface ProgramsProps {
  dict: LandingDict;
}

function ProgramCard({ program, copy, index }: { program: Program; copy: LandingDict["programs"]; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 44, scale: 0.94, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.14 }}
      whileHover={{ y: -8 }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(2,6,23,0.35)] ring-1 ring-white/10"
    >
      {/* Poster */}
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={program.image}
          alt={program.badge}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <span className={`absolute left-4 top-4 rounded-full bg-linear-to-r ${program.badgeClass} px-3 py-1 text-[11px] font-bold text-slate-900 shadow`}>
          {program.tag}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-7">
        <h3 className="text-[1.1rem] font-black leading-snug tracking-tight text-[#0F172A]">{program.title}</h3>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#64748B]">{program.description}</p>

        <div className="mt-auto flex items-center gap-6 pt-6 text-[13.5px] font-semibold text-[#475569]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            {program.duration} {copy.perWeek}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            {program.students} {copy.learners}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
          <span className="text-[1.4rem] font-black text-[#0F172A]">{program.price}</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-[13.5px] font-bold text-[#2563EB] transition-all group-hover:gap-2"
          >
            {copy.learnMore}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function Programs({ dict }: ProgramsProps) {
  const { programs } = dict;
  return (
    <section id="programs" className="relative mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="mb-12 flex flex-col gap-7 sm:mb-14 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center rounded-full bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#38BDF8] ring-1 ring-white/15">
            {programs.eyebrow}
          </span>
          <div className="mt-4 flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
              <Image src={BRAND.logo} alt="" width={BRAND.logoWidth} height={BRAND.logoHeight} className="h-6 w-auto object-contain" />
            </span>
            <h2 className="text-[clamp(1.7rem,3.6vw,2.5rem)] font-black leading-tight tracking-tight text-white">{programs.title}</h2>
          </div>
        </motion.div>

        <a
          href="#programs"
          className="group inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-white/10"
        >
          {programs.viewAll}
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        {programs.items.map((program, i) => (
          <ProgramCard key={program.id} program={program} copy={programs} index={i} />
        ))}
      </div>
    </section>
  );
}
