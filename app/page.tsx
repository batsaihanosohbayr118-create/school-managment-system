"use client";

import { useEffect, useState } from "react";
import { getStoredLanguage, languageStorageKey } from "@/lib/i18n";
import { LANDING_CONTENT } from "@/components/landing/constants";
import type { LandingLang } from "@/components/landing/types";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Programs } from "@/components/landing/Programs";
import { Stats } from "@/components/landing/Stats";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  // Default to Mongolian (the school's primary language); respect a stored choice.
  const [lang, setLang] = useState<LandingLang>("mn");
  const [restored, setRestored] = useState(false);
  const dict = LANDING_CONTENT[lang];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = getStoredLanguage();
      if (stored) setLang(stored);
      setRestored(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    // Only persist once the stored choice has been read back, otherwise the
    // default would overwrite it before it is ever applied.
    if (restored) window.localStorage.setItem(languageStorageKey, lang);
  }, [lang, restored]);

  const toggleLang = () => setLang((current) => (current === "mn" ? "en" : "mn"));

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased">
      <Navbar dict={dict} lang={lang} onToggleLang={toggleLang} />

      <main>
        <Hero dict={dict} />

        {/* Everything after the hero scrolls up and overlaps the sticky hero */}
        <div className="relative z-10">
        {/* Dark zone: programs, about/stats, CTA — light-blue -> dark-navy gradient */}
        <div className="relative bg-[linear-gradient(180deg,#1b3a6e_0%,#15294f_26%,#0e1c3a_58%,#0B1226_100%)]">
          {/* Wave that rises up to meet the hero image (matches the gradient top) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full leading-[0]">
            <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="block h-7 w-full sm:h-10">
              <path d="M0,100 L0,64 C320,26 560,26 720,52 C900,82 1160,86 1440,52 L1440,100 Z" fill="#1b3a6e" />
            </svg>
          </div>

          {/* Ambient glows (clipped so they don't spill out of the section) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[8%] top-[20%] h-72 w-72 rounded-full bg-[#2563EB]/20 blur-[130px]" />
            <div className="absolute right-[6%] top-1/2 h-80 w-80 rounded-full bg-[#7c3aed]/15 blur-[140px]" />
          </div>

          <div className="relative pt-10 sm:pt-16">
            <Programs dict={dict} />
            <Stats dict={dict} />
            <CTA dict={dict} />
          </div>
        </div>

        <Footer dict={dict} />
        </div>
      </main>
    </div>
  );
}
