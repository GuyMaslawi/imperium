import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "הרשמה | אימפריום" };

export default async function RegisterPage() {
  if (await getSessionUserId()) redirect("/game/base");
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
