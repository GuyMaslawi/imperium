import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { EditorSection } from "@/components/admin/fields";
import { MiniGameCreator } from "@/components/admin/MiniGameCreator";
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
        בחר סוג, קבע פרס — ולחץ <span className="font-bold text-gold-bright">🚀 צור והפעל מיד</span> כדי לשחרר לכולם בלחיצה אחת.
        כותרת ריקה מקבלת אוטומטית את שם המשחק. התשובה מוגרלת מחדש בכל הפעלה.
      </p>

      <EditorSection title="משחק חדש" icon="➕">
        <MiniGameCreator action={createMiniGame} />
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
