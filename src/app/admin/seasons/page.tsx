import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, EditorSection } from "@/components/admin/fields";
import {
  createSeason,
  updateSeason,
  activateSeason,
  deleteSeason,
  resetSeason,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

/** Format a Date as the value a <input type="datetime-local"> expects. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminSeasonsPage() {
  await requireAdmin();

  const [seasons, counts] = await Promise.all([
    prisma.gameSeason.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.empire.groupBy({ by: ["seasonId"], _count: { _all: true } }),
  ]);
  const countBySeason = new Map(counts.map((c) => [c.seasonId, c._count._all]));
  const totalEmpires = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <div className="space-y-6">
      <SectionHeading title="עונות" subtitle="SEASONS" ornament="📅" />

      <EditorSection title="עונה חדשה" icon="➕">
        <ActionForm action={createSeason} submitLabel="צור עונה">
          <div className="grid gap-3 sm:grid-cols-3">
            <LabeledInput label="שם" name="name" required placeholder="עונה 1" />
            <LabeledInput label="התחלה" name="startsAt" type="datetime-local" required />
            <LabeledInput label="סיום" name="endsAt" type="datetime-local" required />
          </div>
        </ActionForm>
      </EditorSection>

      <div className="space-y-4">
        {seasons.map((s) => (
          <div key={s.id} className="panel rounded-xl p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gold-bright">
                {s.name}
                {s.isActive && (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    פעילה
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-zinc-500">
                {countBySeason.get(s.id) ?? 0} אימפריות
              </span>
            </div>

            <ActionForm action={updateSeason} submitLabel="שמור" submitVariant="secondary">
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <LabeledInput label="שם" name="name" defaultValue={s.name} required />
                <LabeledInput label="התחלה" name="startsAt" type="datetime-local" defaultValue={toLocalInput(s.startsAt)} required />
                <LabeledInput label="סיום" name="endsAt" type="datetime-local" defaultValue={toLocalInput(s.endsAt)} required />
              </div>
            </ActionForm>

            <div className="mt-3 flex flex-wrap gap-2">
              {!s.isActive && (
                <ActionForm action={activateSeason} submitLabel="הפעל עונה" submitClassName="text-xs">
                  <input type="hidden" name="id" value={s.id} />
                </ActionForm>
              )}
              <ActionForm
                action={deleteSeason}
                submitLabel="מחק עונה"
                submitVariant="danger"
                submitClassName="text-xs"
                confirm="למחוק את העונה? אימפריות משויכות יאבדו את שיוך העונה."
              >
                <input type="hidden" name="id" value={s.id} />
              </ActionForm>
            </div>
          </div>
        ))}
        {seasons.length === 0 && (
          <p className="panel-inset rounded-xl p-6 text-center text-zinc-500">אין עונות עדיין</p>
        )}
      </div>

      {/* Danger zone — full season reset. */}
      <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4 sm:p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-red-300">
          💥 איפוס עונה
        </h3>
        <p className="mb-3 text-[12px] leading-relaxed text-zinc-400">
          מאפס את <strong className="text-red-300">כל {totalEmpires} השחקנים</strong> ומתחיל עונה
          מחדש: כל אימפריה נבנית מאפס (משאבים, מבנים, צבא, שדרוגים, נשק, גיבור ובנק), וכל הגילדות
          נמחקות. חשבונות המשתמשים נשמרים, וכל שחקן <strong className="text-emerald-300">שומר את
          יתרת היהלומים</strong> שלו. פעולה זו בלתי הפיכה.
        </p>
        <ActionForm
          action={resetSeason}
          submitLabel="אפס את העונה"
          submitVariant="danger"
          confirm={`לאפס את כל ${totalEmpires} השחקנים ולהתחיל עונה מחדש? פעולה בלתי הפיכה!`}
        >
          <LabeledInput
            label='להקלדת אישור, כתוב "אפס"'
            name="confirm"
            required
            placeholder="אפס"
          />
        </ActionForm>
      </div>
    </div>
  );
}
