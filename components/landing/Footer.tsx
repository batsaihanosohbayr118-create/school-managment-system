"use client";

import { useState } from "react";
import Image from "next/image";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { BRAND, SOCIALS } from "./constants";
import type { LandingDict } from "./types";

interface FooterProps {
  dict: LandingDict;
}

// lucide-react no longer ships brand marks, so social icons are inline SVGs.
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H17V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H7.8V14h2.7v8h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.7 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.3-3.8.3-3.8s0-2.5-.3-3.8zM10 15V9l5.2 3L10 15z" />
    </svg>
  );
}

const SOCIAL_ICONS = { facebook: FacebookIcon, instagram: InstagramIcon, youtube: YoutubeIcon } as const;

const SOCIAL_STYLES: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-linear-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
  youtube: "bg-[#FF0000]"
};

export function Footer({ dict }: FooterProps) {
  const { footer } = dict;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer id="contact" className="relative border-t border-white/10 bg-[#0B1226]">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-[#2563EB] to-[#38BDF8]">
                <Image src={BRAND.logo} alt={BRAND.name} width={BRAND.logoWidth} height={BRAND.logoHeight} className="h-6 w-auto object-contain" />
              </span>
              <span className="leading-tight">
                <strong className="block text-[16px] font-extrabold text-white">{BRAND.name}</strong>
                <small className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {BRAND.suffix}
                </small>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-slate-400">{footer.tagline}</p>
            <div className="mt-6 flex gap-3">
              {SOCIALS.map((social) => {
                const Icon = SOCIAL_ICONS[social.id as keyof typeof SOCIAL_ICONS];
                return (
                  <a
                    key={social.id}
                    href={social.href}
                    aria-label={social.label}
                    className={`grid h-10 w-10 place-items-center rounded-xl text-white shadow-md transition hover:-translate-y-0.5 ${SOCIAL_STYLES[social.id] ?? "bg-white/10"}`}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-white">{footer.quickLinksTitle}</h3>
            <ul className="mt-5 space-y-3.5">
              {footer.quickLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.href} className="text-[14px] text-slate-400 transition hover:text-[#38BDF8]">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-white">{footer.contactTitle}</h3>
            <ul className="mt-5 space-y-3.5 text-[14px] text-slate-400">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-[#38BDF8]" />
                <a href={`tel:${footer.phone.replace(/\s/g, "")}`} className="transition hover:text-white">
                  {footer.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-[#38BDF8]" />
                <a href={`mailto:${footer.email}`} className="transition hover:text-white">
                  {footer.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-[#38BDF8]" />
                {footer.address}
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[14px] font-bold uppercase tracking-wider text-white">{footer.followTitle}</h3>
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 focus-within:ring-[#2563EB]">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSent(false);
                  }}
                  placeholder={footer.newsletterPlaceholder}
                  className="w-full bg-transparent px-3 py-2 text-[14px] text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[#2563EB] to-[#4F46E5] text-white transition hover:opacity-90"
                >
                  <Send size={17} />
                </button>
              </div>
              {sent ? <p className="mt-2 text-[13px] text-[#34d399]">✓ {email}</p> : null}
            </form>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-7 text-center text-[13px] text-slate-500">
          © {new Date().getFullYear()} {BRAND.name} {BRAND.suffix}. {footer.rights}
        </div>
      </div>
    </footer>
  );
}
