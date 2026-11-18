import type { LucideIcon } from "lucide-react";

export type LandingLang = "mn" | "en";

export interface NavLink {
  id: string;
  href: string;
  label: string;
}

export interface Program {
  id: string;
  /** Small category pill text, e.g. "Математик". */
  tag: string;
  /** Large neon banner label, e.g. "МАТЕМАТИК". */
  badge: string;
  title: string;
  description: string;
  duration: string;
  students: string;
  price: string;
  /** Tailwind gradient classes for the neon card header. */
  gradient: string;
  /** Tailwind box-shadow glow class for the header. */
  glow: string;
  /** Tailwind gradient classes for the category pill. */
  badgeClass: string;
  icon: LucideIcon;
  /** Poster image shown at the top of the card. */
  image: string;
}

export interface StatCard {
  value: number;
  suffix: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip. */
  chip: string;
}

export interface LandingDict {
  nav: NavLink[];
  loginLabel: string;
  hero: {
    badge: string;
    titleLines: string[];
    highlight: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    activeStudents: string;
  };
  programs: {
    eyebrow: string;
    title: string;
    viewAll: string;
    learnMore: string;
    perWeek: string;
    learners: string;
    items: Program[];
  };
  why: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    stats: StatCard[];
  };
  cta: {
    title: string;
    highlight: string;
    subtitle: string;
    button: string;
  };
  footer: {
    tagline: string;
    quickLinksTitle: string;
    quickLinks: NavLink[];
    contactTitle: string;
    phone: string;
    email: string;
    address: string;
    followTitle: string;
    newsletterPlaceholder: string;
    rights: string;
  };
}
