import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledBool, LabeledInput, EditorSection } from "@/components/admin/fields";
import { LocalTime, SeasonSchedule, SeasonEndPicker } from "@/components/admin/DateTimeField";
import {
  createSeason,
  updateSeason,
  activateSeason,
  shortenSeason,
  deleteSeason,
  resetSeason,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  await requireAdmin();

  const [seasons, counts, archived] = await Promise.all([
    prisma.gameSeason.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.empire.groupBy({ by: ["seasonId"], _count: { _all: true } }),
    // Which seasons already have a record in the hall. Read off the archive
    // table rather than a relation — SeasonChampion holds none, so that a
    // deleted season keeps its champions.
    prisma.seasonChampion.groupBy({ by: ["seasonId"], _count: { _all: true } }),
  ]);
  const countBySeason = new Map(counts.map((c) => [c.seasonId, c._count._all]));
  const archivedBySeason = new Map(archived.map((a) => [a.seasonId, a._count._all]));
  const totalEmpires = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <div className="space-y-6">
      <SectionHeading title="עונות" ornament="📅" />

      <EditorSection title="עונה חדשה" icon="➕">
        <ActionForm action={createSeason} submitLabel="צור עונה">
          <div className="grid gap-3 sm:max-w-xs">
            <LabeledInput label="שם" name="name" required placeholder="עונה 1" />
          </div>
          <SeasonSchedule />
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
                {/* A closed season is not a label — it is the state that shuts
                    the whole game until the next season starts. */}
                {s.closedAt && (
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    נסגרה <LocalTime iso={s.closedAt.toISOString()} />
                  </span>
                )}
                {(archivedBySeason.get(s.id) ?? 0) > 0 && (
                  <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                    בהיכל התהילה
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-zinc-500">
                {countBySeason.get(s.id) ?? 0} אימפריות
              </span>
            </div>

            <ActionForm action={updateSeason} submitLabel="שמור" submitVariant="secondary">
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-3 sm:max-w-xs">
                <LabeledInput label="שם" name="name" defaultValue={s.name} required />
              </div>
              <SeasonSchedule
                startISO={s.startsAt.toISOString()}
                endISO={s.endsAt.toISOString()}
              />
            </ActionForm>

            {/* Ending a running season early. Offered on the active season
                only — a season nobody is playing has nothing to cut short, and
                its dates are editable in the form above. */}
            {s.isActive && !s.closedAt && (
              <div className="mt-3 rounded-lg border border-border-subtle bg-panel-inset p-3">
                <h4 className="mb-2 text-xs font-bold text-gold-dim">⏱️ קיצור העונה</h4>
                <ActionForm
                  action={shortenSeason}
                  submitLabel="קצר את העונה"
                  submitVariant="danger"
                  submitClassName="text-xs"
                  confirm="לקצר את העונה? אם המועד שנבחר כבר עבר, העונה תסתיים מיד: הדירוג יישמר בהיכל התהילה והמשחק יינעל עד תחילת העונה הבאה."
                  className="sm:max-w-xs"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <SeasonEndPicker
                    startISO={s.startsAt.toISOString()}
                    endISO={s.endsAt.toISOString()}
                  />
                </ActionForm>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {!s.isActive && (
                <ActionForm
                  action={activateSeason}
                  submitLabel="הפעל עונה"
                  submitClassName="text-xs"
                  confirm="להפעיל את העונה הזו? העונה הפעילה כעת תיסגר כאילו הסתיימה — הדירוג שלה יישמר בהיכל התהילה, דרך התהילה תתאפס לכל השחקנים, וכל האימפריות יעברו לעונה החדשה עם כל הרכוש שלהן."
                >
                  <input type="hidden" name="id" value={s.id} />
                </ActionForm>
              )}
              {/* The standings are derived from live empires, so a season
                  about to be deleted is the last moment they can be read. */}
              <ActionForm
                action={deleteSeason}
                submitLabel="מחק עונה"
                submitVariant="danger"
                submitClassName="text-xs"
                confirm="למחוק את העונה? אימפריות משויכות יאבדו את שיוך העונה."
                className="min-w-[14rem]"
              >
                <input type="hidden" name="id" value={s.id} />
                <LabeledBool
                  label="לשמור את הדירוג בהיכל התהילה?"
                  name="archive"
                  defaultValue={false}
                  trueLabel="כן — שמור טופ 3"
                  falseLabel="לא"
                />
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
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label='להקלדת אישור, כתוב "אפס"'
              name="confirm"
              required
              placeholder="אפס"
            />
            {/* Read before the wipe, or not at all — the podium is derived from
                the very empires this button deletes. */}
            <LabeledBool
              label="לשמור את הדירוג הסופי בהיכל התהילה?"
              name="archive"
              defaultValue={false}
              trueLabel="כן — שמור טופ 3"
              falseLabel="לא"
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            שמירה רושמת את שלושת המובילים של העונה הפעילה בהיכל התהילה. היא אינה
            סוגרת את העונה — המשחק ממשיך לפעול מיד אחרי האיפוס.
          </p>
        </ActionForm>
      </div>
    </div>
  );
}
