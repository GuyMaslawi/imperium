import { requireAdmin } from "@/lib/admin";
import { getTunables, TUNABLE_META, DEFAULT_TUNABLES, type GameTunables } from "@/lib/game/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { EditorSection } from "@/components/admin/fields";
import { saveTunables, resetTunables } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60";

export default async function AdminBalancePage() {
  await requireAdmin();
  const tunables = await getTunables();
  const groups = Object.keys(TUNABLE_META) as (keyof GameTunables)[];

  return (
    <div className="space-y-6">
      <SectionHeading title="איזון גלובלי" subtitle="GAME BALANCE" ornament="⚖️" />

      <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
        ערכים אלה נקראים ישירות מהלוגיקה של המשחק (חבילת פתיחה, עדכון יומי, קרב וריגול, תפוקה גלובלית).
        שינוי כאן משפיע על כל השחקנים באופן מיידי. השאר שדה ריק כדי לשמור על הערך הקיים.
      </p>

      <ActionForm action={saveTunables} submitLabel="שמור איזון גלובלי">
        <div className="space-y-4">
          {groups.map((group) => {
            const meta = TUNABLE_META[group];
            const values = tunables[group] as Record<string, number>;
            const defaults = DEFAULT_TUNABLES[group] as Record<string, number>;
            return (
              <EditorSection key={group} title={meta.label} icon={meta.icon}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(meta.fields).map(([field, fMeta]) => (
                    <label key={field} className="block space-y-1">
                      <span className="text-xs font-semibold text-gold-dim">{fMeta.label}</span>
                      <input
                        type="number"
                        step={fMeta.step ?? 1}
                        name={`${group}.${field}`}
                        defaultValue={values[field]}
                        dir="ltr"
                        className={INPUT_CLASS}
                      />
                      <span className="block text-[11px] text-zinc-500" dir="ltr">
                        ברירת מחדל: {defaults[field]}
                      </span>
                    </label>
                  ))}
                </div>
              </EditorSection>
            );
          })}
        </div>
      </ActionForm>

      <ActionForm
        action={resetTunables}
        submitLabel="אפס הכל לברירת מחדל"
        submitVariant="danger"
        confirm="לאפס את כל ערכי האיזון לברירת המחדל של הקוד?"
      />
    </div>
  );
}
