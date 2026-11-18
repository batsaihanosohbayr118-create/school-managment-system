"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, ShieldCheck, UserPlus, Zap } from "lucide-react";
import { useSiteReady } from "@/lib/site-ready";
import { translations } from "@shared/i18n-tables";
import { RegisterForm } from "./RegisterForm";

const copy = translations.mn.register;
const hidden = { opacity: 0, y: 24, filter: "blur(8px)" };

const FEATURES = [
  { icon: Zap, title: "Дүн, ирц, хуваарь — нэг системд", body: "Сурагч, багш, эцэг эх бүгд нэг дороос." },
  { icon: ShieldCheck, title: "Аюулгүй, найдвартай", body: "Таны мэдээлэл бидний хувьд чухал." },
  { icon: BarChart3, title: "Ухаалаг тайлан", body: "Ирц, дүнгийн шинжилгээ нэг дороос харна." }
];

/**
 * The registration page: introduction and an illustration on the left, the
 * form on the right, sized so the whole thing fits one desktop screen.
 */
export function RegisterView() {
  const ready = useSiteReady();
  const reveal = (delay: number) => ({
    initial: hidden,
    animate: ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden,
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] text-white lg:h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_20%_15%,rgba(14,165,233,0.22),transparent_65%),radial-gradient(55%_55%_at_80%_90%,rgba(37,99,235,0.2),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(80%_70%_at_40%_40%,black,transparent)]" />

      <div className="relative z-10 mx-auto grid h-full w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12 lg:px-10 lg:py-6">
        {/* Introduction */}
        <motion.section {...reveal(0)} className="flex min-w-0 flex-col">
          <Link href="/login" className="mb-6 inline-flex w-fit items-center gap-2 text-[14px] font-semibold text-slate-400 transition hover:text-white">
            <ArrowLeft size={16} />
            {copy.signIn}
          </Link>

          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#14b8a6)] shadow-[0_12px_32px_rgba(14,165,233,0.45)]">
              <UserPlus size={26} />
            </span>
            <div>
              <h1 className="text-[1.9rem] font-black leading-tight tracking-tight">{copy.title}</h1>
              <p className="mt-1 text-[14px] text-slate-300">{copy.subtitle}</p>
            </div>
          </div>

          <ul className="mt-8 hidden space-y-5 lg:block">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.25)]">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-sky-100">{title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-400">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <DashboardIllustration />
        </motion.section>

        {/* Form */}
        <motion.section {...reveal(0.1)} className="relative min-w-0">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_50%_10%,rgba(14,165,233,0.18),transparent)] blur-2xl" />
          <div className="running-border rounded-[1.75rem] border border-white/10 bg-[#0b1224]/75 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.7)] backdrop-blur-2xl sm:p-8">
            <RegisterForm />
          </div>
        </motion.section>
      </div>
    </main>
  );
}

/** A small, tilted dashboard drawn in markup — decoration for the introduction column. */
function DashboardIllustration() {
  return (
    <div aria-hidden="true" className="relative mt-10 hidden h-[220px] lg:block" style={{ perspective: "900px" }}>
      <div className="absolute bottom-0 left-1/2 h-16 w-[115%] -translate-x-1/2 rounded-[50%] border-2 border-sky-400/50 shadow-[0_0_40px_rgba(56,189,248,0.45)]" />
      <div
        className="absolute left-4 top-2 flex h-[190px] w-[340px] gap-3 rounded-2xl border border-white/15 bg-[#0f1a33]/90 p-3 shadow-[0_30px_60px_rgba(2,6,23,0.8)]"
        style={{ transform: "rotateX(14deg) rotateY(18deg) rotateZ(-4deg)" }}
      >
        <div className="flex w-10 flex-col items-center gap-2.5 rounded-lg bg-white/[0.04] py-2">
          <span className="h-4 w-4 rounded bg-sky-500" />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-1.5 w-5 rounded-full bg-white/15" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {["bg-emerald-400", "bg-violet-400", "bg-sky-400"].map((tone) => (
              <div key={tone} className="flex items-center gap-1.5 rounded-md bg-white/[0.05] p-1.5">
                <span className={`h-3 w-3 rounded ${tone}`} />
                <span className="h-1.5 flex-1 rounded-full bg-white/15" />
              </div>
            ))}
          </div>
          <div className="relative flex-1 overflow-hidden rounded-lg bg-white/[0.04] p-2">
            <span className="block h-1.5 w-16 rounded-full bg-white/20" />
            <svg className="absolute inset-x-0 bottom-0 h-[70%] w-full" preserveAspectRatio="none" viewBox="0 0 200 80">
              <defs>
                <linearGradient id="register-illus-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 70 L20 60 L35 64 L55 46 L70 52 L90 36 L110 42 L130 24 L150 30 L170 12 L200 6 L200 80 L0 80 Z" fill="url(#register-illus-area)" />
              <path d="M0 70 L20 60 L35 64 L55 46 L70 52 L90 36 L110 42 L130 24 L150 30 L170 12 L200 6" fill="none" stroke="#2dd4bf" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
      <div
        className="absolute left-[300px] top-10 flex h-[86px] w-[110px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#13203d]/95 shadow-[0_20px_40px_rgba(2,6,23,0.8)]"
        style={{ transform: "rotateY(16deg) rotateZ(-3deg)" }}
      >
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="none" r="14" stroke="rgba(148,163,184,0.2)" strokeWidth="6" />
          <circle cx="18" cy="18" fill="none" r="14" stroke="#38bdf8" strokeDasharray="60 88" strokeWidth="6" />
          <circle cx="18" cy="18" fill="none" r="14" stroke="#8b5cf6" strokeDasharray="22 88" strokeDashoffset="-60" strokeWidth="6" />
        </svg>
        <div className="space-y-1.5">
          <span className="block h-1.5 w-8 rounded-full bg-white/25" />
          <span className="block h-1.5 w-6 rounded-full bg-white/15" />
        </div>
      </div>
      <div
        className="absolute left-[290px] top-[136px] w-[120px] space-y-1.5 rounded-xl border border-white/15 bg-[#13203d]/95 p-2.5 shadow-[0_20px_40px_rgba(2,6,23,0.8)]"
        style={{ transform: "rotateY(16deg) rotateZ(-3deg)" }}
      >
        {["bg-sky-400", "bg-violet-400", "bg-emerald-400"].map((tone) => (
          <div key={tone} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
            <span className="h-1.5 flex-1 rounded-full bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  );
}
