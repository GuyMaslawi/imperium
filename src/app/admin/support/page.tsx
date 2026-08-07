import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SupportInbox } from "@/components/admin/SupportInbox";
import { isDiscordAnnouncerConfigured } from "@/server/discord";

export const dynamic = "force-dynamic";

/**
 * The support queue.
 *
 * Everything on this screen was written by somebody who could not reach us any
 * other way — the chat behind the login page (see server/actions/support.ts).
 * Answering here puts the reply straight back into their panel, wherever they
 * are, with no account and no mail delivery in the path.
 *
 * `?thread=<id>` opens one directly: that is the link the Discord notification
 * carries, so a ping in the team's room is one click from the conversation.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  await requireAdmin();
  const { thread } = await searchParams;
  const notifies = isDiscordAnnouncerConfigured("support");

  return (
    <div className="space-y-4">
      <SectionHeading title="תמיכה" ornament="🛟" />

      <p
        className={`rounded-lg border px-3 py-2 text-xs ${
          notifies
            ? "border-[#5865F2]/45 bg-[#5865F2]/10 text-[#c7ccff]"
            : "border-amber-700/50 bg-amber-950/30 text-amber-300"
        }`}
      >
        {notifies
          ? "כל פנייה חדשה נשלחת גם לערוץ התמיכה בדיסקורד (עם קישור ישיר לשיחה), עם השהיה של עשר דקות בין התראות באותה פנייה."
          : "התראות דיסקורד כבויות — DISCORD_WEBHOOK_URL_SUPPORT לא מוגדר. בלעדיו אף אחד לא יידע שנפתחה פנייה עד שמישהו ייכנס למסך הזה."}
      </p>

      <SupportInbox initialThreadId={thread ?? null} />
    </div>
  );
}
