import { loadCachedWorkCalendar } from "@/lib/airtable";
import { getSignedInEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Opening the page or pressing Refresh (?fresh) gets data at most a minute
// old; the background poll reuses a five-minute copy.
const FRESH_MAX_AGE_SECONDS = 60;
const POLL_MAX_AGE_SECONDS = 300;

export async function GET(request: Request): Promise<Response> {
  const noStore = { "Cache-Control": "no-store" };
  if (!(await getSignedInEmail())) {
    return Response.json(
      { error: "Not signed in" },
      { status: 401, headers: noStore },
    );
  }
  try {
    const fresh = new URL(request.url).searchParams.has("fresh");
    const calendar = await loadCachedWorkCalendar(
      fresh ? FRESH_MAX_AGE_SECONDS : POLL_MAX_AGE_SECONDS,
    );
    return Response.json(calendar, { headers: noStore });
  } catch (error) {
    console.error("Airtable sync failed", error);
    return Response.json(
      { error: "Airtable sync failed" },
      { status: 502, headers: noStore },
    );
  }
}
