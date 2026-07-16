import { requireEmpire } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatNumber } from "@/lib/game/format";
import {
  GUILD_CAPACITY_MAX_LEVEL,
  GUILD_CREATION_COST_DIAMONDS,
  GUILD_ROLE_META,
  GUILD_SPELL_MAX_LEVEL,
  GUILD_SPELL_TYPES,
  capacityUpgradeCostDiamonds,
  guildCapacity,
  guildSpellBonusPct,
  spellCastCostDiamonds,
  spellUpgradeCostDiamonds,
} from "@/lib/game/guild";
import { GuildCreateForm } from "@/components/game/GuildCreateForm";
import { GuildJoinButton } from "@/components/game/GuildJoinButton";
import { GuildBankPanel } from "@/components/game/GuildBankPanel";
import { GuildShopCard } from "@/components/game/GuildShopCard";
import { GuildCapacityCard } from "@/components/game/GuildCapacityCard";
import { GuildMemberActions } from "@/components/game/GuildMemberActions";
import { GuildLeaveButton } from "@/components/game/GuildLeaveButton";

export const metadata = { title: "הברית שלי | WARZONE" };

const formatTime = (date: Date) =>
  date.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/* -------- no guild yet: create + browse open guilds -------- */

async function NoGuildView({ diamonds }: { diamonds: number }) {
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { role: "LEADER" },
        include: { empire: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {/* -------- active recruitment (right in RTL) -------- */}
      <div className="panel rounded-xl p-4">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <span aria-hidden>👥</span>
          גיוס בריתות פעיל
        </h2>

        {guilds.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            עדיין אין בריתות בממלכה — היה הראשון להקים אחת!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-right text-xs text-gold-dim">
                  <th className="pb-2 pr-2 font-semibold">שם הברית</th>
                  <th className="pb-2 font-semibold">מנהיג</th>
                  <th className="pb-2 font-semibold">חברים</th>
                  <th className="pb-2 pl-2 font-semibold">הצטרפות</th>
                </tr>
              </thead>
              <tbody>
                {guilds.map((guild) => {
                  const capacity = guildCapacity(guild.capacityLevel);
                  const memberCount = guild._count.members;
                  return (
                    <tr
                      key={guild.id}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td className="py-3 pr-2">
                        <span className="font-semibold text-zinc-100">
                          {guild.name}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-300">
                        {guild.members[0]?.empire.name ?? "—"}
                      </td>
                      <td className="py-3">
                        <span className="nums text-zinc-200" dir="ltr">
                          {memberCount}/{capacity}
                        </span>
                      </td>
                      <td className="py-3 pl-2">
                        <GuildJoinButton
                          guildId={guild.id}
                          full={memberCount >= capacity}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------- create guild (left in RTL) -------- */}
      <div className="panel-gold relative rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>🏰</span>
            יצירת ברית
          </h2>
          <span className="nums rounded-full border border-gold/50 bg-panel-inset px-3 py-1 text-sm font-bold text-sky-300">
            💎 {GUILD_CREATION_COST_DIAMONDS}
          </span>
        </div>

        <GuildCreateForm diamonds={diamonds} />
      </div>
    </div>
  );
}

/* -------- page -------- */

export default async function GuildPage() {
  const empire = await requireEmpire();

  const membership = await prisma.guildMember.findUnique({
    where: { empireId: empire.id },
    include: {
      guild: {
        include: {
          members: {
            include: { empire: { select: { id: true, name: true, level: true } } },
          },
          spells: true,
          transactions: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
    },
  });

  const diamonds = Math.floor(empire.diamonds);

  if (!membership) {
    return (
      <div className="space-y-6">
        <SectionHeading title="הברית שלי" subtitle="MY GUILD" ornament="🏰" />
        <NoGuildView diamonds={diamonds} />
      </div>
    );
  }

  const { guild } = membership;
  const capacity = guildCapacity(guild.capacityLevel);
  const members = [...guild.members].sort(
    (a, b) =>
      GUILD_ROLE_META[a.role].order - GUILD_ROLE_META[b.role].order ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  // The viewer's active spell buffs, keyed by type.
  const now = new Date();
  const activeBuffs = await prisma.guildSpellBuff.findMany({
    where: { empireId: empire.id, expiresAt: { gt: now } },
  });
  const activeUntilByType = new Map(
    activeBuffs.map((buff) => [buff.type, buff.expiresAt.toISOString()])
  );
  const spellLevelByType = new Map(guild.spells.map((s) => [s.type, s.level]));

  return (
    <div className="space-y-6">
      <SectionHeading title={guild.name} subtitle="MY GUILD" ornament="🏰" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          התפקיד שלך:{" "}
          <span className="font-bold text-gold-bright">
            {GUILD_ROLE_META[membership.role].icon}{" "}
            {GUILD_ROLE_META[membership.role].label}
          </span>
        </p>
        <GuildLeaveButton
          disbands={membership.role === "LEADER" && members.length === 1}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* -------- members -------- */}
        <div className="panel rounded-xl p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>👥</span>
            חברי הברית
            <span className="nums mr-auto text-sm font-bold text-zinc-400" dir="ltr">
              {members.length}/{capacity}
            </span>
          </h2>

          <ul className="space-y-2">
            {members.map((member) => {
              const roleMeta = GUILD_ROLE_META[member.role];
              return (
                <li
                  key={member.id}
                  className="panel-inset flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-semibold text-zinc-100">
                    {member.empire.name}
                    {member.empireId === empire.id && (
                      <span className="mr-1 text-xs text-gold-dim">(אתה)</span>
                    )}
                  </span>
                  <span className="rounded-full border border-gold/40 bg-panel-inset px-2 py-0.5 text-[10px] font-bold text-gold-bright">
                    {roleMeta.icon} {roleMeta.label}
                  </span>
                  <span className="nums text-[11px] text-zinc-500" dir="ltr">
                    LV {member.empire.level}
                  </span>
                  {member.empireId !== empire.id && (
                    <div className="mr-auto">
                      <GuildMemberActions
                        targetEmpireId={member.empireId}
                        targetName={member.empire.name}
                        targetRole={member.role}
                        viewerRole={membership.role}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* -------- guild bank -------- */}
        <div className="panel-gold rounded-xl p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <span aria-hidden>🏦</span>
            בנק הברית
          </h2>

          <GuildBankPanel
            availableGold={Math.floor(empire.gold)}
            guildGold={Math.floor(guild.goldBalance)}
          />

          {guild.transactions.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-dim">
                יומן הקופה
              </h3>
              <ul className="space-y-1">
                {guild.transactions.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 border-b border-border-subtle pb-1 text-xs last:border-0"
                  >
                    <span className="text-zinc-300">
                      {entry.type === "DEPOSIT" ? "⬇️" : "⬆️"} {entry.empireName}
                    </span>
                    <span
                      className={`nums font-bold ${
                        entry.type === "DEPOSIT"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                      dir="ltr"
                    >
                      {entry.type === "DEPOSIT" ? "+" : "-"}
                      {formatNumber(entry.amount)}
                    </span>
                    <span className="nums text-zinc-500" dir="ltr">
                      {formatTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* -------- guild shop -------- */}
      <div className="panel rounded-xl p-4">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <span aria-hidden>🔮</span>
          חנות הברית
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          קסמים נקנים ביהלומים אישיים. שדרוג קסם מעלה את עזרת הברית לכל החברים —
          עד {GUILD_SPELL_MAX_LEVEL}% — והטלה מעניקה לך באפ אישי ל־24 שעות.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {GUILD_SPELL_TYPES.map((type) => {
            const level = spellLevelByType.get(type) ?? 1;
            return (
              <GuildShopCard
                key={type}
                type={type}
                bonusPct={guildSpellBonusPct(level)}
                upgradeCost={
                  level >= GUILD_SPELL_MAX_LEVEL
                    ? null
                    : spellUpgradeCostDiamonds(level)
                }
                castCost={spellCastCostDiamonds(level)}
                activeUntil={activeUntilByType.get(type) ?? null}
                diamonds={diamonds}
              />
            );
          })}
          <GuildCapacityCard
            memberCount={members.length}
            capacity={capacity}
            upgradeCost={
              guild.capacityLevel >= GUILD_CAPACITY_MAX_LEVEL
                ? null
                : capacityUpgradeCostDiamonds(guild.capacityLevel)
            }
            diamonds={diamonds}
          />
        </div>
      </div>
    </div>
  );
}
