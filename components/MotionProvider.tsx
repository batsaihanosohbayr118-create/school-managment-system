"use client";

import { MotionConfig } from "framer-motion";

/**
 * Makes every framer-motion animation on the site honour the OS "reduce
 * motion" setting — transforms are skipped, fades still play. The CSS
 * animations in globals.css opt out through their own media queries.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
