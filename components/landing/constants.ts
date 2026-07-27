import { BookOpen, GraduationCap, Languages, LayoutGrid, ShieldCheck, Trophy, Users } from "lucide-react";
import type { LandingDict, LandingLang } from "./types";

/**
 * Brand palette (kept as constants so every section stays consistent).
 */
export const COLORS = {
  primary: "#2563EB",
  secondary: "#4F46E5",
  accent: "#38BDF8",
  ink: "#0F172A",
  muted: "#64748B",
  navy: "#0B1226"
} as const;

export const BRAND = {
  name: "Nova Mind",
  suffix: "Academy",
  /** Trimmed mark — the source PNG had ~65% transparent padding around the art. */
  logo: "/logo-mark.png",
  logoWidth: 544,
  logoHeight: 420,
  heroImage: "/hero-students.jpg"
} as const;

export const SOCIALS = [
  { id: "facebook", label: "Facebook", href: "#" },
  { id: "instagram", label: "Instagram", href: "#" },
  { id: "youtube", label: "YouTube", href: "#" }
] as const;

const mn: LandingDict = {
  nav: [
    { id: "home", href: "#home", label: "Нүүр" },
    { id: "about", href: "#about", label: "Бидний тухай" },
    { id: "programs", href: "#programs", label: "Сургалт" },
    { id: "contact", href: "#contact", label: "Холбоо барих" }
  ],
  loginLabel: "Нэвтрэх",
  hero: {
    badge: "8 төрлийн хосолсон хөтөлбөр",
    titleLines: ["Сур. Илэрхийл,"],
    highlight: "Нөлөөл!",
    subtitle:
      "Ирээдүйн амжилтаа эндээс эхлүүл! Бидэнтэй хамт мэдлэг, ур чадвараа шинэ түвшинд хүргээрэй.",
    primaryCta: "Бүртгүүлэх",
    secondaryCta: "Багц үзэх",
    activeStudents: "идэвхтэй сурагч"
  },
  programs: {
    eyebrow: "Хөтөлбөрүүд",
    title: "Үндсэн хөтөлбөрүүд",
    viewAll: "Бүгдийг үзэх",
    learnMore: "Дэлгэрэнгүй",
    perWeek: "Долоо хоног",
    learners: "Суралцагч",
    items: [
      {
        id: "math",
        tag: "Математик",
        badge: "МАТЕМАТИК",
        title: "Түвшин ахиулах хоцрогдол арилгах сургалт",
        description: "Үндсэн ойлголтоос ахисан бодлого хүртэл алхам алхмаар.",
        duration: "4",
        students: "10",
        price: "250,000₮",
        gradient: "from-[#4338ca] via-[#4f46e5] to-[#2563eb]",
        glow: "shadow-[0_0_40px_rgba(79,70,229,0.55)]",
        badgeClass: "from-[#a78bfa] to-[#38bdf8]",
        icon: LayoutGrid,
        image: "/poster/mathCourse.webp"
      },
      {
        id: "english",
        tag: "Англи хэл",
        badge: "АНГЛИ ХЭЛ",
        title: "Анхан шатнаас ахисан шат хүртэл",
        description: "Ярианы дадлага, дүрэм болон шалгалтын бэлтгэл нэг дор.",
        duration: "8",
        students: "10",
        price: "250,000₮",
        gradient: "from-[#be123c] via-[#db2777] to-[#7c3aed]",
        glow: "shadow-[0_0_40px_rgba(219,39,119,0.5)]",
        badgeClass: "from-[#fb7185] to-[#f0abfc]",
        icon: Languages,
        image: "/poster/engCourse.webp"
      },
      {
        id: "mongolian",
        tag: "Монгол хэл",
        badge: "МОНГОЛ ХЭЛ БИЧИГ",
        title: "Монгол хэл ба соёлын анхан шат",
        description: "Зөв бичих дүрэм, найруулга болон уран бичлэгийн үндэс.",
        duration: "4",
        students: "15",
        price: "200,000₮",
        gradient: "from-[#047857] via-[#059669] to-[#10b981]",
        glow: "shadow-[0_0_40px_rgba(16,185,129,0.5)]",
        badgeClass: "from-[#6ee7b7] to-[#5eead4]",
        icon: BookOpen,
        image: "/poster/mglCourse.webp"
      }
    ]
  },
  why: {
    eyebrow: "8 төрлийн хосолсон хөтөлбөр",
    title: "Nova Mind Academy",
    description:
      "Та манай сургалтын төвд Математик, Англи, Монгол хэлний туршлагатай багш нараар дамжуулан тав тухтай орчинд өөрийн ур чадвараа нэмэгдүүлээрэй.",
    cta: "Өнөөдрөөс суралц!",
    stats: [
      { value: 200, suffix: "+", label: "Идэвхтэй сурагч", icon: Users, chip: "from-[#2563eb] to-[#38bdf8]" },
      { value: 8, suffix: "+", label: "Хосолсон хөтөлбөр", icon: GraduationCap, chip: "from-[#4f46e5] to-[#7c3aed]" },
      { value: 15, suffix: "+", label: "Мэргэшсэн багш", icon: Trophy, chip: "from-[#f59e0b] to-[#f97316]" },
      { value: 100, suffix: "%", label: "Сэтгэл ханамж", icon: ShieldCheck, chip: "from-[#10b981] to-[#059669]" }
    ]
  },
  cta: {
    title: "Ирээдүйдээ хөрөнгө оруул.",
    highlight: "Мэдлэг бол хүч.",
    subtitle: "Бидэнтэй холбогдож, үнэ төлбөргүй зөвлөгөө аварай.",
    button: "Холбоо барих"
  },
  footer: {
    tagline: "Мэдлэг, ур чадвар, амжилтын төлөө хамтдаа.",
    quickLinksTitle: "Түргэн холбоос",
    quickLinks: [
      { id: "home", href: "#home", label: "Нүүр" },
      { id: "about", href: "#about", label: "Бидний тухай" },
      { id: "programs", href: "#programs", label: "Сургалт" },
      { id: "contact", href: "#contact", label: "Холбоо барих" }
    ],
    contactTitle: "Холбоо барих",
    phone: "+976 1234 5678",
    email: "info@novamind.mn",
    address: "Улаанбаатар, Монгол Улс",
    followTitle: "Биднийг дагах",
    newsletterPlaceholder: "Имэйл хаягаа оруулна уу",
    rights: "Бүх эрх хуулиар хамгаалагдсан."
  }
};

const en: LandingDict = {
  nav: [
    { id: "home", href: "#home", label: "Home" },
    { id: "about", href: "#about", label: "About" },
    { id: "programs", href: "#programs", label: "Programs" },
    { id: "contact", href: "#contact", label: "Contact" }
  ],
  loginLabel: "Login",
  hero: {
    badge: "8 blended learning programs",
    titleLines: ["Learn. Express,"],
    highlight: "Influence!",
    subtitle:
      "Start your future success here. Grow your knowledge and skills with us to a whole new level.",
    primaryCta: "Get started",
    secondaryCta: "Watch video",
    activeStudents: "active students"
  },
  programs: {
    eyebrow: "Programs",
    title: "Core Programs",
    viewAll: "View all",
    learnMore: "Learn more",
    perWeek: "Weeks",
    learners: "Learners",
    items: [
      {
        id: "math",
        tag: "Mathematics",
        badge: "MATHEMATICS",
        title: "Level-up & catch-up mathematics",
        description: "From core concepts to advanced problem solving, step by step.",
        duration: "4",
        students: "10",
        price: "250,000₮",
        gradient: "from-[#4338ca] via-[#4f46e5] to-[#2563eb]",
        glow: "shadow-[0_0_40px_rgba(79,70,229,0.55)]",
        badgeClass: "from-[#a78bfa] to-[#38bdf8]",
        icon: LayoutGrid,
        image: "/poster/mathCourse.webp"
      },
      {
        id: "english",
        tag: "English",
        badge: "ENGLISH",
        title: "From beginner to advanced",
        description: "Speaking practice, grammar and exam prep in one course.",
        duration: "8",
        students: "10",
        price: "250,000₮",
        gradient: "from-[#be123c] via-[#db2777] to-[#7c3aed]",
        glow: "shadow-[0_0_40px_rgba(219,39,119,0.5)]",
        badgeClass: "from-[#fb7185] to-[#f0abfc]",
        icon: Languages,
        image: "/poster/engCourse.webp"
      },
      {
        id: "mongolian",
        tag: "Mongolian",
        badge: "MONGOLIAN",
        title: "Mongolian language & culture basics",
        description: "Spelling, composition and the fundamentals of calligraphy.",
        duration: "4",
        students: "15",
        price: "200,000₮",
        gradient: "from-[#047857] via-[#059669] to-[#10b981]",
        glow: "shadow-[0_0_40px_rgba(16,185,129,0.5)]",
        badgeClass: "from-[#6ee7b7] to-[#5eead4]",
        icon: BookOpen,
        image: "/poster/mglCourse.webp"
      }
    ] as LandingDict["programs"]["items"]
  },
  why: {
    eyebrow: "8 blended programs",
    title: "Nova Mind Academy",
    description:
      "At our center, grow your skills in a comfortable environment guided by experienced teachers of Mathematics, English and Mongolian.",
    cta: "Start today!",
    stats: [
      { value: 200, suffix: "+", label: "Active students", icon: Users, chip: "from-[#2563eb] to-[#38bdf8]" },
      { value: 8, suffix: "+", label: "Blended programs", icon: GraduationCap, chip: "from-[#4f46e5] to-[#7c3aed]" },
      { value: 15, suffix: "+", label: "Expert teachers", icon: Trophy, chip: "from-[#f59e0b] to-[#f97316]" },
      { value: 100, suffix: "%", label: "Satisfaction", icon: ShieldCheck, chip: "from-[#10b981] to-[#059669]" }
    ]
  },
  cta: {
    title: "Invest in your future.",
    highlight: "Knowledge is power.",
    subtitle: "Get in touch with us for a free consultation.",
    button: "Contact us"
  },
  footer: {
    tagline: "Together for knowledge, skills and success.",
    quickLinksTitle: "Quick links",
    quickLinks: [
      { id: "home", href: "#home", label: "Home" },
      { id: "about", href: "#about", label: "About" },
      { id: "programs", href: "#programs", label: "Programs" },
      { id: "contact", href: "#contact", label: "Contact" }
    ],
    contactTitle: "Contact",
    phone: "+976 1234 5678",
    email: "info@novamind.mn",
    address: "Ulaanbaatar, Mongolia",
    followTitle: "Follow us",
    newsletterPlaceholder: "Enter your email",
    rights: "All rights reserved."
  }
};

export const LANDING_CONTENT: Record<LandingLang, LandingDict> = { mn, en };
