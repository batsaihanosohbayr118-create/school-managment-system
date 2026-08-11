import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/types";

/**
 * Stateless session tokens, signed with HMAC-SHA256.
 *
 * Server-only — importing this from a client component would leak AUTH_SECRET.
 * The browser only ever holds the encoded token and reads its payload for
 * display; every trust decision happens here, on the server.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. Add it to .env.");
  }
  return secret;
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function sign(body: string) {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

// Both clients store the profile photo as a raw base64 data URI (no upload
// bucket involved — see mobile/app/settings.tsx and DashboardApp.tsx's
// profile editor) and this token rides along as a bearer header on every
// request. An uncapped photo pushed the header past Vercel's edge limit,
// returning a 494 with no body a client can parse — it surfaced as a plain
// "Request failed." with no clue this was the cause. Anything over this cap
// is dropped from the token; the UI falls back to the initial-letter avatar
// rather than carrying it on every request.
const MAX_TOKEN_AVATAR_LENGTH = 6000;

export function issueToken(user: Omit<TokenPayload, "exp">) {
  const payload: TokenPayload = {
    ...user,
    avatarUrl: user.avatarUrl.length > MAX_TOKEN_AVATAR_LENGTH ? "" : user.avatarUrl,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const body = encode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  // Constant-time compare so a wrong signature can't be probed byte by byte.
  const provided = Buffer.from(signature);
  const expected = Buffer.from(sign(body));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(decode(body)) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
