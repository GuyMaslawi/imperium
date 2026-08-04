import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { requireOpenSeason } from "@/server/seasonGuard";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "הרשמה | קראלדור" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Signing up reopens with the next season — see seasonGuard.
  await requireOpenSeason();
  if (await getSessionUserId()) redirect("/game/base");
  return (
    <AuthShell wide>
      <RegisterForm />
    </AuthShell>
  );
}
