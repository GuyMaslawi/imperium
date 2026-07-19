import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, LabeledSelect } from "@/components/admin/fields";
import { updateGuild, deleteGuild, setGuildMemberRole } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [
  { value: "LEADER", label: "מנהיג" },
  { value: "DEPUTY", label: "סגן" },
  { value: "MEMBER", label: "חבר" },
];

export default async function AdminGuildsPage() {
  await requireAdmin();

  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: { empire: { select: { id: true, name: true, userId: true } } },
        orderBy: { role: "asc" },
      },
      spells: true,
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeading title="בריתות" subtitle="GUILDS" ornament="🤝" />

      {guilds.length === 0 && (
        <p className="panel-inset rounded-xl p-6 text-center text-zinc-500">אין בריתות עדיין</p>
      )}

      <div className="space-y-4">
        {guilds.map((g) => (
          <div key={g.id} className="panel rounded-xl p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gold-bright">🤝 {g.name}</h3>
              <span className="text-[11px] text-zinc-500">
                {g.members.length} חברים · קיבולת {1 + g.capacityLevel}
              </span>
            </div>

            <ActionForm action={updateGuild} submitLabel="שמור" submitVariant="secondary">
              <input type="hidden" name="id" value={g.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <LabeledInput label="שם" name="name" defaultValue={g.name} required />
                <LabeledInput label="💰 אוצר" name="goldBalance" type="number" min={0} defaultValue={Math.round(g.goldBalance)} />
                <LabeledInput label="רמת קיבולת" name="capacityLevel" type="number" min={1} defaultValue={g.capacityLevel} />
              </div>
            </ActionForm>

            {g.members.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-gold-dim">חברי הברית</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.members.map((m) => (
                    <div key={m.id} className="panel-inset rounded-lg p-3">
                      <Link
                        href={`/admin/users/${m.empire.userId}`}
                        className="text-xs font-bold text-gold-bright hover:underline"
                      >
                        {m.empire.name}
                      </Link>
                      <ActionForm
                        action={setGuildMemberRole}
                        submitLabel="עדכן תפקיד"
                        submitVariant="secondary"
                        submitClassName="w-full text-xs"
                        className="mt-2"
                      >
                        <input type="hidden" name="memberId" value={m.id} />
                        <LabeledSelect label="תפקיד" name="role" defaultValue={m.role} options={ROLE_OPTIONS} />
                      </ActionForm>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <ActionForm
                action={deleteGuild}
                submitLabel="פרק ברית"
                submitVariant="danger"
                submitClassName="text-xs"
                confirm="לפרק את הברית? כל החברויות והלחשים יימחקו."
              >
                <input type="hidden" name="id" value={g.id} />
              </ActionForm>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
