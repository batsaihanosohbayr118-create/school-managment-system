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

export function issueToken(user: Omit<TokenPayload, "exp">) {
  const payload: TokenPayload = {
    ...user,
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
