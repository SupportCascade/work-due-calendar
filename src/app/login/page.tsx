import { redirect } from "next/navigation";
import { getSignedInEmail } from "@/lib/auth";
import { LoginScreen } from "@/views/screens";

export const dynamic = "force-dynamic";

export default async function LoginRoute() {
  if (await getSignedInEmail()) redirect("/");
  return <LoginScreen />;
}
