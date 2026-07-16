import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDate } from "@/lib/game/format";
import { markMessagesRead } from "@/server/actions/messages";
import { MarkSeen } from "@/components/game/MarkSeen";
import type { MessageKind } from "@prisma/client";

export const metadata = { title: "הודעות | אימפריום" };

const KIND_META: Record<MessageKind, { icon: string; label: string; tone: string }> = {
  SYSTEM: { icon: "📣", label: "מערכת", tone: "border-gold/40 text-gold" },
  BATTLE: { icon: "⚔️", label: "קרב", tone: "border-red-500/40 text-red-400" },
  SPY: { icon: "🕵️", label: "ריגול", tone: "border-purple-500/40 text-purple-300" },
};

export default async function MessagesPage() {
  const empire = await requireEmpire();

  const messages = await prisma.message.findMany({
    where: { empireId: empire.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // "New" = unread, or read moments ago (so the highlight survives the
  // mark-read revalidation that clears the sidebar badge).
  const freshCutoff = new Date(new Date().getTime() - 2 * 60 * 1000);
  const isNew = (m: (typeof messages)[number]) =>
    m.readAt === null || m.readAt > freshCutoff;

  return (
    <div className="space-y-6">
      <MarkSeen action={markMessagesRead} />
      <SectionHeading title="הודעות" subtitle="MESSAGES" ornament="✉️" />

      {messages.length === 0 ? (
        <div className="panel-gold rounded-xl p-10 text-center">
          <p className="text-4xl">🕊️</p>
          <p className="mt-3 font-bold text-zinc-300">אין הודעות עדיין</p>
          <p className="mt-1 text-sm text-zinc-500">
            התראות על התקפות, מרגלים שנתפסו ועדכוני מערכת יופיעו כאן.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const meta = KIND_META[m.kind];
            const fresh = isNew(m);
            return (
              <li
                key={m.id}
                className={`panel-gold rounded-xl p-4 ${
                  fresh ? "border-gold/60 shadow-[inset_3px_0_0_var(--gold)]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-panel-inset text-xl ${meta.tone}`}
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-bold text-zinc-100">{m.title}</p>
                      {fresh && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                          חדש
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{m.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className={`font-semibold ${meta.tone.split(" ")[1]}`}>
                        {meta.label}
                      </span>
                      <span className="text-zinc-600" aria-hidden>·</span>
                      <span className="nums text-zinc-500" dir="ltr">
                        {formatDate(m.createdAt)}
                      </span>
                      {m.href && (
                        <>
                          <span className="text-zinc-600" aria-hidden>·</span>
                          <Link
                            href={m.href}
                            className="font-bold text-gold-bright hover:text-white"
                          >
                            לצפייה בדוח המלא ←
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
