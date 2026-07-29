import { Icon, type IconName } from "@/components/ui/Icon";
import { SHIELDS, shieldMeta, type ShieldKey } from "@/lib/game/diamondShop";

/**
 * The glyph and tint each raid shield wears — one source of truth so a shield
 * looks the same in the diamond shop, on the rankings ladder and on a target's
 * profile. The shield outline is common to both; the second glyph says *what*
 * is behind it (a warehouse for the resource shield, a helmet for the soldier
 * shield), which is what lets a raider tell them apart at a glance.
 */
export const SHIELD_ICON: Record<ShieldKey, IconName> = {
  resources: "storage",
  soldiers: "army",
};

export const SHIELD_TONE: Record<ShieldKey, string> = {
  resources: "border-gold/50 bg-gold/10 text-gold-bright",
  soldiers: "border-sky-400/50 bg-sky-500/10 text-sky-300",
};

/**
 * The bare pill for one shield — a shield outline plus the glyph of what it
 * covers. Shared by the live badges below, the shop card and the ladder legend
 * so all three stay identical.
 */
export function ShieldGlyph({
  shieldKey,
  size = 12,
  title,
}: {
  shieldKey: ShieldKey;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 font-bold ${SHIELD_TONE[shieldKey]}`}
      title={title}
    >
      <Icon name="shield" size={size} />
      <Icon name={SHIELD_ICON[shieldKey]} size={size} />
    </span>
  );
}

/** Which shields to draw, as expiry timestamps (null / absent = not running). */
export type ShieldState = Partial<Record<ShieldKey, Date | string | null>>;

/** "24.07 · 14:30" — the exact hour a shield drops, for the tooltip. */
function untilLabel(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  const date = d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

/**
 * The shield pills shown beside an empire's name. Renders nothing when the
 * empire holds no shield, so it can be dropped into any row unconditionally.
 */
export function ShieldBadges({
  shields,
  size = "sm",
}: {
  shields: ShieldState | undefined;
  /** `sm` for table rows, `md` for the profile header. */
  size?: "sm" | "md";
}) {
  if (!shields) return null;
  const active = SHIELDS.filter((s) => shields[s.key] != null);
  if (active.length === 0) return null;

  return (
    <>
      {active.map((s) => (
        <ShieldGlyph
          key={s.key}
          shieldKey={s.key}
          size={size === "md" ? 15 : 12}
          title={`${shieldMeta(s.key).badge} · עד ${untilLabel(shields[s.key]!)}`}
        />
      ))}
    </>
  );
}
