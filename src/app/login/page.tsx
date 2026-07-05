import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "התחברות | אימפריום" };

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/game/base");
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
