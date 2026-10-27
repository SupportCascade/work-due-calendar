import { loadWorkCalendar } from "@/lib/airtable";
import { getSignedInEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const noStore = { "Cache-Control": "no-store" };
  if (!(await getSignedInEmail())) {
    return Response.json(
      { error: "Not signed in" },
      { status: 401, headers: noStore },
    );
  }
  try {
    return Response.json(await loadWorkCalendar(), { headers: noStore });
  } catch (error) {
    console.error("Airtable sync failed", error);
    return Response.json(
      { error: "Airtable sync failed" },
      { status: 502, headers: noStore },
    );
  }
}
