"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { markSiteReady } from "@/lib/site-ready";

/**
 * Full-screen intro shown while the site itself is coming up.
 *
 * It is rendered straight into the server HTML so it covers the first paint,
 * then dismisses itself once the document has finished loading. Because it
 * lives in the root layout it plays on a fresh page load only — client-side
 * navigations keep the layout mounted, so moving between pages never replays
 * it.
 */

/** Keeps the animation from flashing by on a warm cache. */
const MIN_VISIBLE_MS = 900;
/** Safety net: a stalled image must never trap the user behind the overlay. */
const MAX_VISIBLE_MS = 5000;
/** Must stay in sync with the .site-loader.is-leaving transition. */
const FADE_MS = 450;

export default function SiteLoader() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "gone">("visible");

  useEffect(() => {
    const startedAt = performance.now();
    let fadeTimer = 0;
    let removeTimer = 0;

    function dismiss() {
      if (fadeTimer) return;
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      fadeTimer = window.setTimeout(() => {
        setPhase("leaving");
        // Release the page's entrance animations as the overlay starts to
        // dissolve, so the content is already rising as it clears.
        markSiteReady();
        removeTimer = window.setTimeout(() => setPhase("gone"), FADE_MS);
      }, remaining);
    }

    if (document.readyState === "complete") dismiss();
    else window.addEventListener("load", dismiss);

    const safetyTimer = window.setTimeout(dismiss, MAX_VISIBLE_MS);

    // Hold the page still underneath. Scrollbars are already hidden globally,
    // so locking overflow costs no layout shift.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("load", dismiss);
      window.clearTimeout(safetyTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase === "gone") document.body.style.overflow = "";
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div aria-hidden className={`site-loader${phase === "leaving" ? " is-leaving" : ""}`} role="presentation">
      <div className="site-loader-mark">
        <span className="site-loader-ring" />
        <span className="site-loader-ring is-inner" />
        <Image src="/logo-mark.png" alt="" width={544} height={420} priority />
      </div>

      <div className="site-loader-copy">
        <strong>Nova Mind Academy</strong>
        <p>Ачаалж байна…</p>
      </div>

      <span className="site-loader-bar" />
    </div>
  );
}
