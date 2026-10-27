import { Email } from "@convex-dev/auth/providers/Email";
import { APP_NAME } from "./constants";

declare const process: { env: Record<string, string | undefined> };

const ALLOWED_DOMAINS = ["cascadewebsolutions.co"];

// Optional comma-separated allowlist (Convex env AUTH_ALLOWED_EMAILS). When
// set, only these exact addresses may sign up, sign in or reset a password;
// otherwise any address on ALLOWED_DOMAINS may.
function allowedEmails(): Set<string> | null {
  const configured = process.env.AUTH_ALLOWED_EMAILS;
  if (!configured) return null;
  return new Set(
    configured
      .split(",")
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function assertAllowedCompanyEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const allowlist = allowedEmails();
  if (allowlist) {
    if (!allowlist.has(normalized)) {
      throw new Error("This email address is not approved for this app.");
    }
    return;
  }
  const domain = normalized.split("@").pop();
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    throw new Error(
      "Only Cascade Web Solutions email addresses may use this app.",
    );
  }
}

function generateOTP() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

async function sendEmail({
  email,
  token,
  subject,
  heading,
  description,
}: {
  email: string;
  token: string;
  subject: string;
  heading: string;
  description: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured on this deployment.");
  }
  // Resend's shared test sender works until a cascadewebsolutions.co sender
  // is verified in Resend; then set AUTH_EMAIL_FROM to it.
  const from =
    process.env.AUTH_EMAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${subject} - ${APP_NAME}`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${heading}</h2>
          <p style="color: #666;">${description}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">${token}</span>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in 15 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">This email was sent by ${APP_NAME}</p>
        </div>
      `,
      text: `${heading}\n\n${description}\n\nYour code is: ${token}\n\nThis code expires in 15 minutes.\n\n---\nThis email was sent by ${APP_NAME}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${await response.text()}`);
  }
}

/** Email verification provider for the sign-up flow (6-digit code via Resend). */
export const VerificationEmail = Email({
  id: "verification-email",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    assertAllowedCompanyEmail(email);
    await sendEmail({
      email,
      token,
      subject: "Verify your email",
      heading: "Verify your email",
      description: "Your verification code is:",
    });
  },
});

/** Password reset email provider, same delivery as VerificationEmail. */
export const PasswordResetEmail = Email({
  id: "password-reset-email",
  maxAge: 60 * 15, // 15 minutes

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    assertAllowedCompanyEmail(email);
    await sendEmail({
      email,
      token,
      subject: "Reset your password",
      heading: "Reset your password",
      description: "Your password reset code is:",
    });
  },
});
