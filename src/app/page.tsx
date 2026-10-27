import { redirect } from "next/navigation";
import { getSignedInEmail } from "@/lib/auth";
import { CalendarScreen } from "@/views/screens";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const email = await getSignedInEmail();
  if (!email) redirect("/login");
  return <CalendarScreen email={email} />;
}
