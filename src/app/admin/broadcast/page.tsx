import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, LabeledSelect, EditorSection } from "@/components/admin/fields";
import { TargetPicker } from "@/components/admin/TargetPicker";
import { broadcastMessage, sendGift } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage() {
  await requireAdmin();

  const [seasons, guilds, empires] = await Promise.all([
    prisma.gameSeason.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true } }),
    prisma.guild.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.empire.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeading title="שידור ומתנות" subtitle="BROADCAST & GIFTS" ornament="📣" />

      <div className="grid gap-4 lg:grid-cols-2">
        <EditorSection title="שידור הודעה" icon="📣">
          <p className="mb-3 text-xs text-zinc-400">
            שלח הודעת מערכת לכל השחקנים, לעונה, לברית או לשחקן בודד. ההודעה מופיעה בתיבת ההודעות ובהתראות החיות.
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
            הענק משאבים, יהלומים, אזרחים, תורות וסיבובי גלגל. אפשר לצרף הודעה שתישלח יחד עם המתנה.
          </p>
          <ActionForm action={sendGift} submitLabel="שלח מתנה" submitVariant="secondary">
            <TargetPicker seasons={seasons} guilds={guilds} empires={empires} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LabeledInput label="🪙 זהב" name="gold" type="number" min={0} placeholder="0" />
              <LabeledInput label="🪵 עץ" name="wood" type="number" min={0} placeholder="0" />
              <LabeledInput label="⚙️ ברזל" name="iron" type="number" min={0} placeholder="0" />
              <LabeledInput label="🪨 אבן" name="stone" type="number" min={0} placeholder="0" />
              <LabeledInput label="💎 יהלומים" name="diamonds" type="number" min={0} placeholder="0" />
              <LabeledInput label="👥 אזרחים" name="citizens" type="number" min={0} placeholder="0" />
              <LabeledInput label="⏳ תורות" name="turns" type="number" min={0} placeholder="0" />
              <LabeledInput label="🎡 סיבובים" name="wheelSpins" type="number" min={0} placeholder="0" />
            </div>
            <LabeledInput label="כותרת הודעה מצורפת (אופציונלי)" name="title" placeholder="🎁 מתנה מההנהלה" />
            <LabeledInput label="תוכן ההודעה" name="body" placeholder="קבל את המתנה שלך!" />
          </ActionForm>
        </EditorSection>
      </div>
    </div>
  );
}
