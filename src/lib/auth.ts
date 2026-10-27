/**
 * NextAuth email + password sign-in without a database.
 *
 * Accounts live in the AUTH_USERS env var as comma-separated
 * `email=scrypt$salt$hash` pairs (make a hash with `npm run hash-password`).
 * Every request re-checks the list, so removing someone locks them out
 * straight away, even with a session cookie still in their browser.
 */
import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

function passwordMatches(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  // A truncated or mistyped entry must never match: a zero-length hash would
  // otherwise compare equal to any password.
  if (expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown, so a wrong email takes as long
// as a wrong password and response times don't reveal who has an account.
const DECOY_HASH = hashPassword(randomBytes(16).toString("hex"));

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function configuredUsers(): Map<string, string> {
  const users = new Map<string, string>();
  for (const entry of (process.env.AUTH_USERS ?? "").split(",")) {
    const separator = entry.indexOf("=");
    if (separator === -1) continue;
    const email = normalizeEmail(entry.slice(0, separator));
    const hash = entry.slice(separator + 1).trim();
    if (email && hash) users.set(email, hash);
  }
  return users;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const email = normalizeEmail(credentials?.email ?? "");
        const password = credentials?.password ?? "";
        const stored = configuredUsers().get(email);
        const valid = passwordMatches(password, stored ?? DECOY_HASH);
        return stored && valid ? { id: email, email } : null;
      },
    }),
  ],
};

/** The signed-in user's email if they are still on AUTH_USERS, else null. */
export async function getSignedInEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  return configuredUsers().has(normalizeEmail(email)) ? email : null;
}
