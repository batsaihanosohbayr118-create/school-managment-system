"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe, LogIn } from "lucide-react";
import { BRAND } from "./constants";
import type { LandingDict, LandingLang } from "./types";

interface NavbarProps {
  dict: LandingDict;
  lang: LandingLang;
  onToggleLang: () => void;
}

export function Navbar({ dict, lang, onToggleLang }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#0b1226]/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "border-b border-white/5 bg-[#0b1226]"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo (far left) */}
        <Link href="#home" className="flex items-center gap-2.5" aria-label={`${BRAND.name} ${BRAND.suffix}`}>
          <span className="grid h-14 w-14 place-items-center">
            <Image src={BRAND.logo} alt={BRAND.name} width={559} height={534} className="h-14 w-14 object-contain" priority />
          </span>
          <span className="leading-tight">
            <strong className="block text-[15px] font-extrabold text-white">{BRAND.name}</strong>
            <small className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              {BRAND.suffix}
            </small>
          </span>
        </Link>

        {/* Language switch + Login (far right) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleLang}
            type="button"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold text-white/85 transition hover:text-white"
          >
            <Globe size={17} />
            {lang === "mn" ? "ENG" : "МОН"}
          </button>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,99,235,0.5)]"
          >
            <LogIn size={16} />
            {dict.loginLabel}
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
