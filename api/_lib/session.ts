/**
 * Email-link sign-in without a database.
 *
 * A sign-in link carries a short-lived token and the session cookie carries a
 * long-lived one; both are `payload.signature`, HMAC-SHA256 signed with
 * AUTH_SECRET. Every request re-checks the approved-email list, so removing an
 * address from AUTH_ALLOWED_EMAILS locks that person out immediately.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "wdc_session";
export const LINK_TTL_SECONDS = 15 * 60;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type TokenPurpose = "link" | "session";
type TokenPayload = { email: string; purpose: TokenPurpose; exp: number };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set (at least 32 characters).");
  }
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isApprovedEmail(email: string): boolean {
  const approved = (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  return approved.includes(normalizeEmail(email));
}

export function createToken(
  email: string,
  purpose: TokenPurpose,
  ttlSeconds: number,
): string {
  const payload: TokenPayload = {
    email: normalizeEmail(email),
    purpose,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Returns the token's email if it is validly signed, unexpired, for this purpose and still approved. */
export function verifyToken(
  token: string | null | undefined,
  purpose: TokenPurpose,
): string | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload.purpose !== purpose) return null;
  if (!(payload.exp > Date.now() / 1000)) return null;
  if (!isApprovedEmail(payload.email)) return null;
  return payload.email;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** The signed-in user's email, or null. */
export function sessionEmail(request: Request): string | null {
  return verifyToken(readCookie(request, SESSION_COOKIE), "session");
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

/**
 * The site's own origin for links in emails. Never taken from the request's
 * Host header, which a caller controls: a spoofed host would put a valid
 * sign-in token into a link pointing at someone else's site.
 */
export function siteOrigin(): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  throw new Error("SITE_URL is not configured.");
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...init.headers,
    },
  });
}
