"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen "offline" notice.
 *
 * `navigator.onLine` is notoriously unreliable (it frequently reports `false`
 * even when the machine is online), so we never block the app on that flag
 * alone. Instead we confirm with a real request to the server before showing
 * anything. We also proactively unregister any stale service worker left over
 * from a previous production build, which can otherwise hijack navigations in
 * development and serve a cached offline page.
 */
export default function NoConnection() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Remove a stale service worker + caches (e.g. from a prior `npm run start`).
    if (process.env.NODE_ENV !== "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
      }
    }

    // Confirm connectivity with an actual request rather than trusting the flag.
    async function verify() {
      try {
        await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
        if (!cancelled) setIsOffline(false);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    }

    const handleOffline = () => verify();
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Only bother checking if the browser claims to be offline on load.
    if (typeof navigator !== "undefined" && !navigator.onLine) verify();

    return () => {
      cancelled = true;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Интернет байхгүй байна</h2>
        <p className="max-w-xs text-base text-gray-500">Интернет холболтоо шалгаад дахин оролдоно уу.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  );
}
