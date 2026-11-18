"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, LogIn, Menu, X } from "lucide-react";
import { useSiteReady } from "@/lib/site-ready";
import { BRAND } from "./constants";
import type { LandingDict, LandingLang } from "./types";

interface NavbarProps {
  dict: LandingDict;
  lang: LandingLang;
  onToggleLang: () => void;
}

export function Navbar({ dict, lang, onToggleLang }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ready = useSiteReady();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#0b1226]/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "border-b border-white/5 bg-[#0b1226]"
      }`}
    >
      <nav className="relative mx-auto flex h-17 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Logo (far left) */}
        <Link href="#home" className="flex items-center gap-3" aria-label={`${BRAND.name} ${BRAND.suffix}`}>
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={BRAND.logoWidth}
            height={BRAND.logoHeight}
            className="h-10 w-auto shrink-0 object-contain"
            priority
          />
          <span className="leading-tight sm:hidden md:block">
            <strong className="block text-[16px] font-extrabold text-white">{BRAND.name}</strong>
            <small className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              {BRAND.suffix}
            </small>
          </span>
        </Link>

        {/* Section links (tablet: in flow; desktop: centred) */}
        <ul className="hidden items-center gap-0.5 sm:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:gap-1">
          {dict.nav.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className="relative block rounded-lg px-2 py-2 text-[12px] font-semibold text-slate-300 lg:px-3.5 lg:text-[13px] transition-colors hover:text-white after:absolute after:inset-x-2 after:bottom-1 lg:after:inset-x-3.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Language switch + Login (far right) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleLang}
            type="button"
            className="hidden items-center sm:flex gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold text-white/85 transition hover:text-white"
          >
            <Globe size={17} />
            {lang === "mn" ? "ENG" : "МОН"}
          </button>

          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-xl sm:inline-flex bg-linear-to-r from-[#2563EB] to-[#4F46E5] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,99,235,0.5)]"
          >
            <LogIn size={16} />
            {dict.loginLabel}
          </Link>

          {/* Menu toggle (mobile only) */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-xl text-white/85 transition hover:bg-white/10 hover:text-white sm:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu: section links, language switch and login */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10 bg-[#0b1226] sm:hidden"
          >
            <ul className="space-y-1 px-5 py-3">
              {dict.nav.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-3 text-[15px] font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="border-t border-white/10 pt-2">
                <button
                  type="button"
                  onClick={onToggleLang}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-[15px] font-bold text-white/85 transition hover:bg-white/5 hover:text-white"
                >
                  <Globe size={18} />
                  {lang === "mn" ? "English" : "Монгол"}
                </button>
              </li>
              <li className="pt-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#2563EB] to-[#4F46E5] px-5 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.4)]"
                >
                  <LogIn size={18} />
                  {dict.loginLabel}
                </Link>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
