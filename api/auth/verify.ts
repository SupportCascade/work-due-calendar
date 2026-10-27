import {
  createToken,
  SESSION_TTL_SECONDS,
  sessionCookie,
  verifyToken,
} from "../_lib/session.js";

export function GET(request: Request): Response {
  const token = new URL(request.url).searchParams.get("token");
  const email = verifyToken(token, "link");
  if (!email) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/?signin=expired", "Cache-Control": "no-store" },
    });
  }

  const session = createToken(email, "session", SESSION_TTL_SECONDS);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie(session, SESSION_TTL_SECONDS),
      "Cache-Control": "no-store",
    },
  });
}
