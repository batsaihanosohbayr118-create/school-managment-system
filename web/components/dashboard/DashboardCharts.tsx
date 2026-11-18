"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import type { Language } from "@/lib/i18n";
import type { AttendanceSlice } from "./dashboard-shared";

/**
 * The revenue chart before any paid invoice exists: a faint grid and a dashed
 * placeholder curve behind the message, so it reads as "a chart goes here",
 * never as data.
 */
export function RevenueEmpty({ language, onOpenPayments }: { language: Language; onOpenPayments?: () => void }) {
  const mn = language === "mn";

  return (
    <div className="revenue-empty">
      <svg aria-hidden="true" className="revenue-empty-ghost" preserveAspectRatio="none" viewBox="0 0 400 160">
        <defs>
          <linearGradient id="revenue-empty-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[32, 64, 96, 128].map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} />
        ))}
        <path className="revenue-empty-area" d="M0 130 C 50 120, 80 90, 130 96 S 210 120, 260 80 S 340 40, 400 30 L 400 160 L 0 160 Z" />
        <path className="revenue-empty-curve" d="M0 130 C 50 120, 80 90, 130 96 S 210 120, 260 80 S 340 40, 400 30" />
      </svg>
      <div className="revenue-empty-body">
        <span className="revenue-empty-icon">
          <TrendingUp size={26} />
        </span>
        <strong>{mn ? "Төлбөрийн бүртгэл алга" : "No payment records yet"}</strong>
        <p>
          {mn
            ? "Төлөгдсөн нэхэмжлэх бүртгэгдсэний дараа сарын орлого энд график хэлбэрээр харагдана."
            : "Monthly revenue appears here as a chart once paid invoices are recorded."}
        </p>
        {onOpenPayments ? (
          <button className="revenue-empty-action" onClick={onOpenPayments} type="button">
            <Wallet size={16} />
            {mn ? "Төлбөр рүү очих" : "Go to payments"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A filled gold trophy: cup, handles, stem and base, with a highlight on the cup. */
function GoldTrophy() {
  return (
    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
      <defs>
        <linearGradient id="trophy-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M7 5H5a2 2 0 0 0 0 4h1.6M17 5h2a2 2 0 0 1 0 4h-1.6" fill="none" stroke="#facc15" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M7 3h10v5.5a5 5 0 0 1-10 0V3z" fill="url(#trophy-gold)" />
      <path d="M9.2 5v3.2a2.8 2.8 0 0 0 1.3 2.4" fill="none" stroke="#fffbeb" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M10.8 13.3h2.4l.5 3.7h-3.4z" fill="#eab308" />
      <rect fill="url(#trophy-gold)" height="3.2" rx="1" width="9" x="7.5" y="17.6" />
    </svg>
  );
}

const MIX_RADIUS = 72;
const MIX_STROKE = 18;
const MIX_CIRCUMFERENCE = 2 * Math.PI * MIX_RADIUS;

/**
 * Attendance as a ring of status arcs with the present rate in its centre, a
 * legend row per status with its count and share — so no status is told apart
 * by colour alone — and a one-line verdict underneath. Hovering an arc or a
 * row highlights the pair.
 */
export function AttendanceMixChart({
  slices,
  language,
  onOpen
}: {
  slices: AttendanceSlice[];
  language: Language;
  onOpen?: () => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const percent = (value: number) => (total ? Math.round((value / total) * 100) : 0);
  const rate = percent(slices.find((slice) => slice.status === "present")?.value ?? 0);
  const shown = slices.filter((slice) => slice.value > 0);
  const mn = language === "mn";

  // Start the arcs empty and let the transition sweep them in.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Round caps reach half a stroke past each end, so a gap between arcs has to clear both.
  const gap = shown.length > 1 ? MIX_STROKE + 6 : 0;
  const spans = shown.map((slice) => (slice.value / total) * MIX_CIRCUMFERENCE);
  const arcs = shown.map((slice, index) => ({
    slice,
    offset: spans.slice(0, index).reduce((sum, span) => sum + span, 0),
    length: Math.max(spans[index] - gap, 0.01)
  }));

  const verdict =
    rate >= 90
      ? { tone: "good", icon: <GoldTrophy />, title: mn ? "Сайн байна!" : "Great job!" }
      : rate >= 75
        ? { tone: "fair", icon: <TrendingUp size={20} />, title: mn ? "Дунджаас дээгүүр" : "Above average" }
        : { tone: "low", icon: <AlertTriangle size={20} />, title: mn ? "Анхаарах шаардлагатай" : "Needs attention" };
  const verdictBody = (
    <>
      <span className="attendance-mix-verdict-icon">{verdict.icon}</span>
      <span className="attendance-mix-verdict-text">
        <strong>{verdict.title}</strong>
        <small>{mn ? `Нийт ирц ${rate}% байна.` : `Overall attendance is ${rate}%.`}</small>
      </span>
    </>
  );

  return (
    <div className="attendance-mix" onMouseLeave={() => setActive(null)}>
      <div className="attendance-mix-body">
        <div className="attendance-mix-ring">
          <svg viewBox="0 0 180 180" role="img" aria-label={slices.map((slice) => `${slice.name} ${slice.value}`).join(", ")}>
            <defs>
              {/* The ring is turned -90°, so these run top-left to bottom-right on screen. */}
              <linearGradient gradientUnits="userSpaceOnUse" id="attendance-present" x1="160" x2="20" y1="20" y2="160">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="55%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle className="attendance-mix-track" cx="90" cy="90" r={MIX_RADIUS} strokeWidth={MIX_STROKE} />
            {arcs.map(({ slice, offset, length }) => (
              <circle
                className={active && active !== slice.status ? "dimmed" : undefined}
                cx="90"
                cy="90"
                key={slice.status}
                onMouseEnter={() => setActive(slice.status)}
                r={MIX_RADIUS}
                stroke={slice.status === "present" ? "url(#attendance-present)" : slice.color}
                strokeDasharray={`${drawn ? length : 0} ${MIX_CIRCUMFERENCE}`}
                strokeDashoffset={-(offset + gap / 2)}
                strokeLinecap={shown.length > 1 ? "round" : "butt"}
                strokeWidth={MIX_STROKE}
              >
                <title>{`${slice.name}: ${slice.value} (${percent(slice.value)}%)`}</title>
              </circle>
            ))}
          </svg>
          <div className="attendance-mix-center">
            <strong>{rate}%</strong>
            <span>{mn ? "Нийт ирц" : "Attendance"}</span>
          </div>
        </div>
        <ul className="attendance-mix-legend">
          {slices.map((slice) => (
            <li
              className={[active === slice.status ? "active" : "", slice.value === 0 ? "empty" : ""].filter(Boolean).join(" ") || undefined}
              key={slice.status}
              onMouseEnter={() => setActive(slice.status)}
            >
              <i style={{ background: slice.color }} />
              <span>{slice.name}</span>
              <strong>{slice.value}</strong>
              <em>{percent(slice.value)}%</em>
            </li>
          ))}
        </ul>
      </div>
      {onOpen ? (
        <button className={`attendance-mix-verdict ${verdict.tone}`} onClick={onOpen} type="button">
          {verdictBody}
          <ChevronRight size={18} />
        </button>
      ) : (
        <div className={`attendance-mix-verdict ${verdict.tone}`}>{verdictBody}</div>
      )}
    </div>
  );
}
