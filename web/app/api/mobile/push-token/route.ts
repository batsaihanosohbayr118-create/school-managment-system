import { setPushToken } from "@/lib/auth-db";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["POST"];

export const OPTIONS = preflight(METHODS);

type PushTokenBody = {
  token?: string;
};

/**
 * Registers (or replaces) the calling account's Expo push token. Called on
 * every app launch once notification permission is granted — cheap to
 * re-run, and it's how a token rotation or a device switch stays current.
 */
export const POST = mobileRoute<{ ok: true }>(METHODS, async (context, request) => {
  const body = (await request.json().catch(() => null)) as PushTokenBody | null;
  if (!body?.token) {
    throw new Error("token is required.");
  }

  await setPushToken(context.session.email, body.token);
  return { ok: true };
});
