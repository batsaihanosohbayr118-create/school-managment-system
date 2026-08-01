"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks the moment the intro overlay (components/SiteLoader.tsx) starts
 * clearing.
 *
 * Entrance animations that run on mount would otherwise play out completely
 * while the overlay still covers the screen, so by the time it fades the
 * content is simply there — no reveal. Gating them on this flag holds them
 * until they are actually visible.
 */

let ready = false;
const listeners = new Set<() => void>();

export function markSiteReady() {
  if (ready) return;
  ready = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Reports `false` on the server and during hydration so markup matches, then
 * flips once the overlay leaves. On a later client-side navigation the flag is
 * already set, so components animate on mount as usual.
 */
export function useSiteReady() {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false
  );
}
