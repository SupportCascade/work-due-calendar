// PHI console redaction (active only on PHI deployments) — imported first
// so the auth library's own logging is shimmed too.
import "./phiLogging";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { configuredAuthProviders } from "./authProviders";
import { configuredJwtDurationMs } from "./viktorSpaceAuthEnv";

declare const process: { env: Record<string, string | undefined> };

function decodePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.includes("\n")) return key;
  if (key.startsWith("-----BEGIN")) {
    return key
      .replace("-----BEGIN PRIVATE KEY----- ", "-----BEGIN PRIVATE KEY-----\n")
      .replace(" -----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----")
      .split(" ")
      .join("\n");
  }
  try {
    return atob(key);
  } catch {
    return key;
  }
}

const authPrivateKey = process.env.AUTH_PRIVATE_KEY;
if (authPrivateKey) {
  process.env.AUTH_PRIVATE_KEY = decodePrivateKey(authPrivateKey);
}

const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
if (jwtPrivateKey) {
  process.env.JWT_PRIVATE_KEY = decodePrivateKey(jwtPrivateKey);
}

// Email + password only, limited to approved addresses; see authProviders.ts.
// The JWT lifetime is what decides whether a returning member's stored session
// authenticates with the WebSocket handshake alone or first has to be
// refreshed; see configuredJwtDurationMs.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: configuredAuthProviders(),
  jwt: { durationMs: configuredJwtDurationMs() },
});

export const currentUser = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
