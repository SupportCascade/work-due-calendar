import { Password } from "@convex-dev/auth/providers/Password";
import type { AuthProviderConfig } from "@convex-dev/auth/server";
import {
  assertAllowedCompanyEmail,
  PasswordResetEmail,
  VerificationEmail,
} from "./authEmail";

declare const process: { env: Record<string, string | undefined> };

/**
 * Email + password sign-in, limited to approved addresses (see authEmail.ts).
 * With RESEND_API_KEY set, new accounts must confirm their email with a code
 * and forgotten passwords can be reset; without it, neither email is sent.
 */
export function configuredAuthProviders(): AuthProviderConfig[] {
  const emailEnabled = Boolean(process.env.RESEND_API_KEY);
  return [
    Password({
      // Runs on every flow (sign up, sign in, reset), so a removed address
      // is locked out even if its account already exists.
      profile(params) {
        const email = String(params.email ?? "");
        assertAllowedCompanyEmail(email);
        return { email: email.trim().toLowerCase() };
      },
      ...(emailEnabled
        ? { verify: VerificationEmail, reset: PasswordResetEmail }
        : {}),
    }),
  ];
}
