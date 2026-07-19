import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, LabeledSelect, EditorSection } from "@/components/admin/fields";
import { prizeText, MINIGAME_TYPE_META } from "@/lib/game/minigame";
import {
  createMiniGame,
  activateMiniGame,
  deactivateMiniGame,
  deleteMiniGame,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminMiniGamePage() {
  await requireAdmin();
  const games = await prisma.miniGameEvent.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  return (
    <div className="space-y-6">
      <SectionHeading title="מיני-משחק" subtitle="MINI-GAME" ornament="🎯" />

      <p className="panel-inset rounded-xl p-4 text-center text-sm text-zinc-400">
        צור מיני-משחק עם פרס מוגדר מראש. ברגע שתפעיל אותו — הוא משוחרר לכל השחקנים כפס עליון חי בראש המסך.
        התשובה מוגרלת אוטומטית בכל הפעלה. שדה מקסימום זוכים ששווה 0 פירושו ללא הגבלה.
      </p>

      <EditorSection title="מיני-משחק חדש" icon="➕">
        <ActionForm action={createMiniGame} submitLabel="צור מיני-משחק">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <LabeledSelect
              label="סוג"
              name="type"
              options={[
                { value: "GUESS_NUMBER", label: "🔢 נחש את המספר" },
                { value: "FIND_BALL", label: "🔮 מצא את הכדור" },
              ]}
            />
            <LabeledInput label="כותרת" name="title" required placeholder="נחשו וזכו!" />
            <LabeledInput label="מקסימום ניסיונות לשחקן" name="maxAttempts" type="number" min={1} defaultValue={5} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <LabeledInput label="מינימום (נחש מספר)" name="min" type="number" defaultValue={1} />
            <LabeledInput label="מקסימום (נחש מספר)" name="max" type="number" defaultValue={100} />
            <LabeledInput label="מספר כוסות (מצא כדור)" name="cups" type="number" min={2} defaultValue={3} hint="2–6" />
            <LabeledInput label="מקסימום זוכים (0=ללא הגבלה)" name="maxWinners" type="number" min={0} defaultValue={0} />
          </div>

          <p className="text-xs font-semibold text-gold-dim">פרס</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LabeledInput label="🪙 זהב" name="prizeGold" type="number" min={0} placeholder="0" />
            <LabeledInput label="🪵 עץ" name="prizeWood" type="number" min={0} placeholder="0" />
            <LabeledInput label="⚙️ ברזל" name="prizeIron" type="number" min={0} placeholder="0" />
            <LabeledInput label="🪨 אבן" name="prizeStone" type="number" min={0} placeholder="0" />
            <LabeledInput label="💎 יהלומים" name="prizeDiamonds" type="number" min={0} placeholder="0" />
            <LabeledInput label="👥 אזרחים" name="prizeCitizens" type="number" min={0} placeholder="0" />
            <LabeledInput label="⏳ תורות" name="prizeTurns" type="number" min={0} placeholder="0" />
            <LabeledInput label="🎡 סיבובים" name="prizeWheelSpins" type="number" min={0} placeholder="0" />
          </div>
        </ActionForm>
      </EditorSection>

      <div className="space-y-3">
        {games.map((g) => (
          <div
            key={g.id}
            className={`panel rounded-xl p-4 ${g.isActive ? "ring-1 ring-emerald-500/50" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-gold-bright">
                  <span aria-hidden>{MINIGAME_TYPE_META[g.type].icon}</span>
                  {g.title}
                  {g.isActive && (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      פעיל עכשיו
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {MINIGAME_TYPE_META[g.type].label} · פרס:{" "}
                  <span className="text-amber-200" dir="ltr">
                    {prizeText(g)}
                  </span>{" "}
                  · {g.maxAttempts} ניסיונות ·{" "}
                  {g.maxWinners === 0 ? "זוכים ללא הגבלה" : `עד ${g.maxWinners} זוכים`} · זכו עד כה{" "}
                  <span className="nums" dir="ltr">
                    {g.winnersCount}
                  </span>{" "}
                  · {g._count.entries} משתתפים
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {g.isActive ? (
                  <ActionForm action={deactivateMiniGame} submitLabel="⏹ הפסק" submitVariant="danger" submitClassName="text-xs">
                    <input type="hidden" name="id" value={g.id} />
                  </ActionForm>
                ) : (
                  <ActionForm action={activateMiniGame} submitLabel="🚀 שחרר לכולם" submitClassName="text-xs">
                    <input type="hidden" name="id" value={g.id} />
                  </ActionForm>
                )}
                <ActionForm
                  action={deleteMiniGame}
                  submitLabel="🗑 מחק"
                  submitVariant="secondary"
                  submitClassName="text-xs"
                  confirm="למחוק את המיני-משחק?"
                >
                  <input type="hidden" name="id" value={g.id} />
                </ActionForm>
              </div>
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <p className="panel-inset rounded-xl p-6 text-center text-zinc-500">אין מיני-משחקים עדיין</p>
        )}
      </div>
    </div>
  );
}
