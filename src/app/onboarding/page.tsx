import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata = { title: "הקמת אימפריה | קראלדור" };

// Where a signed-in user without an empire (typically a fresh Google sign-up)
// names and creates their empire. Already-signed-in users with an empire, and
// signed-out visitors, are bounced away.
export default async function OnboardingPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, empire: { select: { id: true } } },
  });
  if (!user) redirect("/login");
  if (user.empire) redirect("/game/base");

  return (
    <AuthShell wide>
      <OnboardingForm userName={user.name} />
    </AuthShell>
  );
}
