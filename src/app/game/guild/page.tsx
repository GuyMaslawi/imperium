import { requireEmpire } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import {
  GUILD_AID_MAX_LEVEL,
  GUILD_CAPACITY_MAX_LEVEL,
  GUILD_CREATION_COST_DIAMONDS,
  GUILD_ROLE_META,
  GUILD_SPELL_MAX_LEVEL,
  GUILD_SPELL_TYPES,
  aidUpgradeCostGold,
  capacityUpgradeCostGold,
  guildAidPct,
  guildCapacity,
  guildSpellBonusPct,
  spellCastCostDiamonds,
  spellUpgradeCostDiamonds,
} from "@/lib/game/guild";
import { GuildCreateForm } from "@/components/game/GuildCreateForm";
import { GuildJoinButton } from "@/components/game/GuildJoinButton";
import { GuildAddMemberForm } from "@/components/game/GuildAddMemberForm";
import { GuildShopCard } from "@/components/game/GuildShopCard";
import { GuildCapacityCard } from "@/components/game/GuildCapacityCard";
import { GuildAidCard } from "@/components/game/GuildAidCard";
import { GuildMemberActions } from "@/components/game/GuildMemberActions";
import { GuildLeaveButton } from "@/components/game/GuildLeaveButton";

export const metadata = { title: "הברית שלי | IMPERIUM" };

/** How many guilds the recruitment browser lists. */
const GUILD_BROWSE_LIMIT = 100;

/* -------- no guild yet: create + browse open guilds -------- */

async function NoGuildView({ diamonds }: { diamonds: number }) {
  // Bounded: this is a recruitment browser, not a directory. Unbounded it grew
  // with the player count and carried a nested per-guild join, reachable by any
  // guildless player on every page load.
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "asc" },
    take: GUILD_BROWSE_LIMIT,
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
          <Icon name="citizens" size={18} className="text-crimson" />
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
            <Icon name="base" size={18} className="text-crimson" />
            יצירת ברית
          </h2>
          <span className="nums flex items-center gap-1 rounded-full border border-gold/50 bg-panel-inset px-3 py-1 text-sm font-bold text-sky-300">
            <Icon name="diamond" size={14} /> {GUILD_CREATION_COST_DIAMONDS}
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
        },
      },
    },
  });

  const diamonds = Math.floor(empire.diamonds);

  if (!membership) {
    return (
      <div className="space-y-6">
        <SectionHeading
          title="הברית שלי"
          subtitle="MY GUILD"
          ornament={<Icon name="base" size={22} className="text-crimson" />}
        />
        <NoGuildView diamonds={diamonds} />
      </div>
    );
  }

  const { guild } = membership;
  const capacity = guildCapacity(guild.capacityLevel);
  const availableGold = Math.floor(empire.gold);
  const isLeadership = membership.role !== "MEMBER";
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
      <SectionHeading
        title={guild.name}
        subtitle="MY GUILD"
        ornament={<Icon name="base" size={22} className="text-crimson" />}
      />

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

      <div className="grid items-start gap-4">
        {/* -------- members -------- */}
        <div className="panel rounded-xl p-4">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="citizens" size={18} className="text-crimson" />
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

          {/* Leader and deputy recruit straight into the roster. */}
          {isLeadership && (
            <GuildAddMemberForm full={members.length >= capacity} />
          )}
        </div>
      </div>

      {/* -------- gold upgrades, paid personally (no guild bank) -------- */}
      <div className="panel rounded-xl p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="gold" size={18} className="text-gold-bright" />
            שדרוגי זהב הברית
          </h2>
          <span className="nums flex items-center gap-1 rounded-full border border-gold/40 bg-panel-inset px-3 py-1 text-xs font-bold text-gold-bright" dir="ltr">
            {formatNumber(availableGold)}{" "}
            <Icon name="gold" size={13} className="text-gold-bright" />
          </span>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          לברית אין בנק — שדרוגים לכל הברית משולמים מ
          <span className="font-semibold text-gold-dim">הזהב הזמין שלך</span>, לא מיהלומים.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <GuildCapacityCard
            memberCount={members.length}
            capacity={capacity}
            upgradeCost={
              guild.capacityLevel >= GUILD_CAPACITY_MAX_LEVEL
                ? null
                : capacityUpgradeCostGold(guild.capacityLevel)
            }
            availableGold={availableGold}
            mayUpgrade={isLeadership}
          />
          <GuildAidCard
            aidPct={guildAidPct(guild.aidLevel)}
            upgradeCost={
              guild.aidLevel >= GUILD_AID_MAX_LEVEL
                ? null
                : aidUpgradeCostGold(guild.aidLevel)
            }
            availableGold={availableGold}
          />
        </div>
      </div>

      {/* -------- diamond spell shop -------- */}
      <div className="panel rounded-xl p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="diamond" size={18} className="text-cyan-300" />
            קסמי יהלום
          </h2>
          <span className="nums flex items-center gap-1 rounded-full border border-cyan-400/40 bg-panel-inset px-3 py-1 text-xs font-bold text-cyan-300" dir="ltr">
            {formatNumber(diamonds)}{" "}
            <Icon name="diamond" size={13} className="text-cyan-300" />
          </span>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          קסמי התקפה, הגנה, משאבים וריגול נקנים ב
          <span className="font-semibold text-cyan-300">יהלומים</span> אישיים. שדרוג קסם מעלה את עזרת הקסם לכל החברים —
          כל אחד עד {GUILD_SPELL_MAX_LEVEL}% — והטלה מעניקה לך באפ אישי ל־24 שעות.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GUILD_SPELL_TYPES.map((type) => {
            const level = spellLevelByType.get(type) ?? 1;
            // Resolve the "active until HH:MM" label here (server-side) so the
            // client card never reads the clock during render.
            const activeUntil = activeUntilByType.get(type) ?? null;
            const activeLabel =
              activeUntil && new Date(activeUntil).getTime() > new Date().getTime()
                ? new Date(activeUntil).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;
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
                activeLabel={activeLabel}
                diamonds={diamonds}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
