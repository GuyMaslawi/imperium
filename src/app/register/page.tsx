import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { requireOpenSeason } from "@/server/seasonGuard";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("הרשמה | קראלדור") };
}

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
