import type { DiamondEffectKind, GuildSpellType, PotionKind } from "@prisma/client";
import { ActionForm } from "@/components/admin/ActionForm";
import { EditorSection, LabeledInput, LabeledSelect, StatLine } from "@/components/admin/fields";
import { POTION_KINDS, POTION_META } from "@/lib/game/potions";
import { GUILD_SPELL_META, GUILD_SPELL_TYPES } from "@/lib/game/guild";
import {
  clearGuildBuffs,
  grantGuildBuff,
  setDiamondEffect,
  setPotionEffect,
  setPotionStack,
} from "@/server/actions/admin";

/**
 * Every timed thing running on the empire, in one place.
 *
 * The three tables behind this panel are unrelated in the schema (potions,
 * diamond effects, guild spells) but identical to the player: a buff with a
 * clock on it. An admin chasing "why is this empire producing double" has to
 * be able to see all three at once, so they share a panel.
 */
export interface PlayerBuffsProps {
  empireId: string;
  userId: string;
  potionStacks: { kind: PotionKind; count: number }[];
  potionEffects: { kind: PotionKind; expiresAt: Date }[];
  diamondEffects: {
    id: string;
    kind: DiamondEffectKind;
    magnitude: number;
    activeUntil: Date | null;
    readyAt: Date | null;
  }[];
  guildBuffs: { id: string; type: GuildSpellType; bonusPct: number; expiresAt: Date }[];
}

/** Hebrew names for the diamond-store effects, in store order. */
const DIAMOND_EFFECT_LABEL: Record<DiamondEffectKind, string> = {
  RESOURCE_BOOST_GOLD: "בונוס הפקת זהב",
  RESOURCE_BOOST_WOOD: "בונוס הפקת עץ",
  RESOURCE_BOOST_IRON: "בונוס הפקת ברזל",
  RESOURCE_BOOST_STONE: "בונוס הפקת אבן",
  SHOP_DISCOUNT: "הנחה בחנות",
  BANK_INTEREST: "ריבית בנק (צינון)",
  TURN_PACK_1: "חבילת תורות 1 (צינון)",
  TURN_PACK_2: "חבילת תורות 2 (צינון)",
  TURN_PACK_3: "חבילת תורות 3 (צינון)",
  TURN_PACK_4: "חבילת תורות 4 (צינון)",
  SHIELD_RESOURCES: "מגן משאבים",
  SHIELD_SOLDIERS: "מגן חיילים",
  CITY_DOWNGRADE: "ירידת עיר (צינון)",
};

const DIAMOND_EFFECT_KINDS = Object.keys(DIAMOND_EFFECT_LABEL) as DiamondEffectKind[];

function fmt(d: Date | null): string {
  return d ? d.toLocaleString("he-IL") : "—";
}

/** Minutes left on a clock, or "פג" once it is behind us. */
function remaining(d: Date | null): string {
  if (!d) return "—";
  const min = Math.round((d.getTime() - Date.now()) / 60_000);
  return min > 0 ? `עוד ${min} דק׳` : "פג";
}

export function PlayerBuffs({
  empireId,
  userId,
  potionStacks,
  potionEffects,
  diamondEffects,
  guildBuffs,
}: PlayerBuffsProps) {
  return (
    <>
      {/* ---------------- potions ---------------- */}
      <EditorSection title="שיקויים" icon="🧪">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {POTION_KINDS.map((kind) => {
            const meta = POTION_META[kind];
            const stack = potionStacks.find((s) => s.kind === kind);
            const effect = potionEffects.find((e) => e.kind === kind);
            return (
              <div key={kind} className="panel-inset space-y-3 rounded-lg p-3">
                <div>
                  <p className={`text-xs font-bold ${meta.tone}`}>{meta.label}</p>
                  <p className="text-[11px] text-zinc-500">{meta.tagline}</p>
                </div>
                <StatLine
                  label="פעיל"
                  value={remaining(effect?.expiresAt ?? null)}
                  tone={effect ? "text-emerald-300" : "text-zinc-500"}
                />

                <ActionForm
                  action={setPotionStack}
                  submitLabel="שמור מלאי"
                  submitVariant="secondary"
                  submitClassName="w-full text-xs"
                >
                  <input type="hidden" name="empireId" value={empireId} />
                  <input type="hidden" name="userId" value={userId} />
                  <input type="hidden" name="kind" value={kind} />
                  <LabeledInput
                    label="בקבוקים בתיק"
                    name="count"
                    type="number"
                    min={0}
                    defaultValue={stack?.count ?? 0}
                  />
                </ActionForm>

                <ActionForm
                  action={setPotionEffect}
                  submitLabel="הפעל אפקט"
                  submitVariant="secondary"
                  submitClassName="w-full text-xs"
                >
                  <input type="hidden" name="empireId" value={empireId} />
                  <input type="hidden" name="userId" value={userId} />
                  <input type="hidden" name="kind" value={kind} />
                  <LabeledInput
                    label="דקות פעילות"
                    name="minutes"
                    type="number"
                    min={0}
                    defaultValue={0}
                    hint="0 מבטל את האפקט"
                  />
                </ActionForm>
              </div>
            );
          })}
        </div>
      </EditorSection>

      {/* ---------------- diamond effects ---------------- */}
      <EditorSection title="אפקטי יהלומים ומגנים" icon="💎">
        {diamondEffects.length > 0 ? (
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {diamondEffects.map((fx) => (
              <div key={fx.id} className="panel-inset rounded-lg p-3">
                <p className="text-xs font-bold text-gold-bright">
                  {DIAMOND_EFFECT_LABEL[fx.kind]}
                </p>
                <StatLine label="עוצמה" value={`${fx.magnitude}%`} />
                <StatLine
                  label="פעיל עד"
                  value={fx.activeUntil ? `${fmt(fx.activeUntil)} (${remaining(fx.activeUntil)})` : "—"}
                />
                <StatLine label="זמין שוב" value={fmt(fx.readyAt)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-xs text-zinc-500">אין אפקטים פעילים.</p>
        )}

        <ActionForm
          action={setDiamondEffect}
          submitLabel="הגדר אפקט"
          className="panel rounded-lg p-3"
        >
          <input type="hidden" name="empireId" value={empireId} />
          <input type="hidden" name="userId" value={userId} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LabeledSelect
              label="סוג"
              name="kind"
              options={DIAMOND_EFFECT_KINDS.map((k) => ({
                value: k,
                label: DIAMOND_EFFECT_LABEL[k],
              }))}
            />
            <LabeledInput label="עוצמה באחוזים" name="magnitude" type="number" min={0} defaultValue={0} />
            <LabeledInput label="דקות פעילות" name="activeMinutes" type="number" min={0} defaultValue={0} />
            <LabeledInput label="דקות צינון" name="cooldownMinutes" type="number" min={0} defaultValue={0} />
          </div>
          <p className="text-[11px] text-zinc-500">
            בונוסים ומגנים משתמשים ב״דקות פעילות״; ריבית הבנק וחבילות התורות
            משתמשות ב״דקות צינון״. אפס בכל השדות מוחק את האפקט.
          </p>
        </ActionForm>
      </EditorSection>

      {/* ---------------- guild spell buffs ---------------- */}
      <EditorSection title="קסמי ברית פעילים" icon="✨">
        {guildBuffs.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {guildBuffs.map((b) => (
              <span key={b.id} className="panel-inset rounded-lg px-3 py-2 text-[11px] text-zinc-300">
                {GUILD_SPELL_META[b.type].label} · +{b.bonusPct}% · {remaining(b.expiresAt)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-xs text-zinc-500">אין קסמים פעילים.</p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <ActionForm
            action={grantGuildBuff}
            submitLabel="הענק קסם"
            submitVariant="secondary"
            className="panel rounded-lg p-3"
          >
            <input type="hidden" name="empireId" value={empireId} />
            <input type="hidden" name="userId" value={userId} />
            <div className="grid gap-3 sm:grid-cols-3">
              <LabeledSelect
                label="קסם"
                name="type"
                options={GUILD_SPELL_TYPES.map((t) => ({
                  value: t,
                  label: GUILD_SPELL_META[t].label,
                }))}
              />
              <LabeledInput label="בונוס %" name="bonusPct" type="number" min={0} defaultValue={10} />
              <LabeledInput label="שעות" name="hours" type="number" min={0} defaultValue={24} />
            </div>
          </ActionForm>

          <ActionForm
            action={clearGuildBuffs}
            submitLabel="הסר את כל הקסמים"
            submitVariant="danger"
            className="panel rounded-lg p-3"
            confirm="להסיר את כל קסמי הברית מהאימפריה?"
          >
            <input type="hidden" name="empireId" value={empireId} />
            <input type="hidden" name="userId" value={userId} />
          </ActionForm>
        </div>
      </EditorSection>
    </>
  );
}
