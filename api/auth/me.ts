import { json, sessionEmail } from "../_lib/session.js";

export function GET(request: Request): Response {
  const email = sessionEmail(request);
  if (!email) return json({ error: "Not signed in" }, { status: 401 });
  return json({ email });
}
