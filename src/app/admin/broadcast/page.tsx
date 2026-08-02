import { prisma } from "@/lib/prisma";
import { requireAdmin, ADMIN_INT_MAX } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import {
  LabeledInput,
  LabeledSelect,
  EditorSection,
  ResourceFieldLabel,
} from "@/components/admin/fields";
import { TargetPicker } from "@/components/admin/TargetPicker";
import { broadcastMessage, sendGift } from "@/server/actions/admin";
import { isDiscordAnnouncerConfigured } from "@/server/discord";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  await requireAdmin();
  const discordAnnouncer = isDiscordAnnouncerConfigured();

  const [seasons, guilds, empires] = await Promise.all([
    prisma.gameSeason.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    prisma.guild.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.empire.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading title="שידור ומתנות" ornament="📣" />

      <div className="grid gap-4 lg:grid-cols-2">
        <EditorSection title="שידור הודעה" icon="📣">
          <p className="mb-3 text-xs text-zinc-400">
            שלח הודעת מערכת לכל השחקנים, לפעילים בלבד, לעונה, לברית או לשחקן בודד. ההודעה מופיעה בתיבת ההודעות ובהתראות החיות.
          </p>
          {/* An admin typing a broadcast has no other way to know it is about
              to be reposted publicly — and the rule (all-players only) is not
              guessable from the form. It is stated here, next to the field. */}
          <p
            className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
              discordAnnouncer
                ? "border-[#5865F2]/45 bg-[#5865F2]/10 text-[#c7ccff]"
                : "border-border-subtle bg-black/25 text-zinc-500"
            }`}
          >
            {discordAnnouncer
              ? "שידור לכלל השחקנים מתפרסם אוטומטית גם בערוץ הדיסקורד. שידור לעונה, לברית או לשחקן בודד — לא."
              : "פרסום אוטומטי לדיסקורד כבוי (DISCORD_WEBHOOK_URL לא מוגדר)."}
          </p>
          <ActionForm action={broadcastMessage} submitLabel="שדר הודעה">
            <TargetPicker seasons={seasons} guilds={guilds} empires={empires} />
            <LabeledSelect
              label="סוג"
              name="kind"
              defaultValue="SYSTEM"
              options={[
                { value: "SYSTEM", label: "מערכת (זהב)" },
                { value: "BATTLE", label: "קרב (אדום)" },
                { value: "SPY", label: "ריגול (סגול)" },
              ]}
            />
            <LabeledInput label="כותרת" name="title" required placeholder="📣 הודעה חשובה" />
            <LabeledInput label="קישור (אופציונלי)" name="href" dir="ltr" placeholder="/game/base" />
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gold-dim">תוכן</span>
              <textarea
                name="body"
                rows={4}
                required
                className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60"
              />
            </label>
          </ActionForm>
        </EditorSection>

        <EditorSection title="שליחת מתנה / פרס" icon="🎁">
          <p className="mb-3 text-xs text-zinc-400">
            הענק משאבים, יהלומים, אזרחים, תורות וסיבובי גלגל — לכולם או רק לשחקנים שהיו פעילים לאחרונה. אפשר לצרף הודעה שתישלח יחד עם המתנה.
          </p>
          <ActionForm action={sendGift} submitLabel="שלח מתנה" submitVariant="secondary">
            <TargetPicker seasons={seasons} guilds={guilds} empires={empires} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LabeledInput label={<ResourceFieldLabel resource="gold" text="זהב" />} name="gold" type="number" min={0} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="wood" text="עץ" />} name="wood" type="number" min={0} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="iron" text="ברזל" />} name="iron" type="number" min={0} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="stone" text="אבן" />} name="stone" type="number" min={0} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="diamonds" text="יהלומים" />} name="diamonds" type="number" min={0} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="citizens" text="אזרחים" />} name="citizens" type="number" min={0} max={ADMIN_INT_MAX} placeholder="0" />
              <LabeledInput label={<ResourceFieldLabel resource="turns" text="תורות" />} name="turns" type="number" min={0} max={ADMIN_INT_MAX} placeholder="0" />
              <LabeledInput label="🎡 סיבובים" name="wheelSpins" type="number" min={0} max={ADMIN_INT_MAX} placeholder="0" />
            </div>
            <LabeledInput label="כותרת הודעה מצורפת (אופציונלי)" name="title" placeholder="🎁 מתנה מההנהלה" />
            <LabeledInput label="תוכן ההודעה" name="body" placeholder="קבל את המתנה שלך!" />
          </ActionForm>
        </EditorSection>
      </div>
    </div>
  );
}
