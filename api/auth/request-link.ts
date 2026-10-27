import {
  createToken,
  isApprovedEmail,
  json,
  LINK_TTL_SECONDS,
  normalizeEmail,
  siteOrigin,
} from "../_lib/session.js";

const APP_NAME = "Work Due Calendar";

async function sendLinkEmail(to: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
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
      to,
      subject: `Your sign-in link - ${APP_NAME}`,
      html: `
        <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Sign in to ${APP_NAME}</h2>
          <p style="color: #666;">Click the button below to sign in. The link works for 15 minutes.</p>
          <p style="margin: 28px 0; text-align: center;">
            <a href="${link}" style="background: #0f2a4a; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Sign in</a>
          </p>
          <p style="color: #999; font-size: 12px;">If you didn't ask for this, you can ignore this email.</p>
        </div>
      `,
      text: `Sign in to ${APP_NAME}:\n\n${link}\n\nThe link works for 15 minutes. If you didn't ask for this, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend HTTP ${response.status}: ${await response.text()}`);
  }
}

export async function POST(request: Request): Promise<Response> {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  } catch {
    // Falls through to the invalid-email response.
  }
  if (!email || !email.includes("@") || email.length > 254) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Same answer for approved and unapproved addresses, so the form can't be
  // used to discover who has access.
  if (isApprovedEmail(email)) {
    const token = createToken(email, "link", LINK_TTL_SECONDS);
    const link = `${siteOrigin()}/api/auth/verify?token=${encodeURIComponent(token)}`;
    try {
      await sendLinkEmail(email, link);
    } catch (error) {
      console.error("Sign-in email failed", error);
      return json(
        { error: "Couldn't send the email. Try again in a minute." },
        { status: 502 },
      );
    }
  }
  return json({ ok: true });
}
