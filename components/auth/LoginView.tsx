"use client";

import { motion } from "framer-motion";
import { BrandPanel } from "./BrandPanel";
import { LoginCard } from "./LoginCard";

const PARTICLES = [
  { pos: "left-[8%] top-[16%]", size: "h-1 w-1", dur: 4, delay: 0 },
  { pos: "left-[18%] top-[70%]", size: "h-1.5 w-1.5", dur: 5, delay: 0.6 },
  { pos: "left-[42%] top-[10%]", size: "h-1 w-1", dur: 4.5, delay: 1 },
  { pos: "left-[55%] top-[82%]", size: "h-1 w-1", dur: 5.5, delay: 0.3 },
  { pos: "left-[72%] top-[22%]", size: "h-1.5 w-1.5", dur: 4.2, delay: 1.4 },
  { pos: "left-[88%] top-[60%]", size: "h-1 w-1", dur: 5, delay: 0.9 },
  { pos: "left-[30%] top-[38%]", size: "h-1 w-1", dur: 6, delay: 1.8 },
  { pos: "left-[65%] top-[48%]", size: "h-1 w-1", dur: 4.8, delay: 0.5 },
  { pos: "left-[92%] top-[30%]", size: "h-1 w-1", dur: 5.2, delay: 1.2 },
  { pos: "left-[12%] top-[46%]", size: "h-1.5 w-1.5", dur: 4.6, delay: 2 }
];

/** Full-screen login experience: dark gradient stage + split brand/login layout. */
export function LoginView() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020617] px-4 py-8 text-white">
      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_15%_10%,rgba(49,46,129,0.55),transparent_60%),radial-gradient(70%_60%_at_90%_90%,rgba(30,58,138,0.45),transparent_60%)]" />

      {/* Blur circles */}
      <div className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sky-600/20 blur-[150px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-[130px]" />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute rounded-full bg-white/50 ${p.pos} ${p.size}`}
          animate={{ opacity: [0.15, 0.8, 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      {/* Split container */}
      <div className="relative z-10 grid w-full max-w-[1400px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-[0_40px_120px_rgba(2,6,23,0.7)] backdrop-blur-sm lg:min-h-[82vh] lg:grid-cols-2">
        <BrandPanel />
        <div className="flex items-center justify-center bg-[#0b1020]/40 p-6 backdrop-blur-xl sm:p-10 lg:p-12">
          <LoginCard />
        </div>
      </div>
    </main>
  );
}
