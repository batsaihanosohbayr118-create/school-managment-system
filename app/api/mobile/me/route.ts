import type { MobileProfile } from "@shared/api-types";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<MobileProfile>(METHODS, async ({ session }) => ({
  email: session.email,
  name: session.name,
  role: session.role,
  avatarUrl: session.avatarUrl
}));
