import { json, sessionCookie } from "../_lib/session.js";

export function POST(): Response {
  return json(
    { ok: true },
    { headers: { "Set-Cookie": sessionCookie("", 0) } },
  );
}
