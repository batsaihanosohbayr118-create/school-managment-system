import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@/lib/types";


const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string;
  phone: string;
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


export const FILE_LINK_TTL_SECONDS = 5 * 60;

function fileSignature(fileId: string, exp: number) {
  return sign(`file:${fileId}.${exp}`);
}

export function issueFileSignature(fileId: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + FILE_LINK_TTL_SECONDS;
  return { exp, sig: fileSignature(fileId, exp) };
}

export function verifyFileSignature(fileId: string, exp: string | null, sig: string | null, now = Date.now()) {
  const expiresAt = Number(exp);
  if (!sig || !Number.isInteger(expiresAt) || expiresAt * 1000 <= now) return false;

  const provided = Buffer.from(sig);
  const expected = Buffer.from(fileSignature(fileId, expiresAt));
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
