"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { applyPendingUpdates } from "@/lib/game/updates";
import {
  POTION_META,
  potionDurationLabel,
  potionExpiryAfterDrink,
} from "@/lib/game/potions";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";
import { getT } from "@/i18n/server";

async function requireOwnEmpireId(): Promise<string> {
  // Enforces the ban on every action (not just page loads); see getActiveEmpireId.
  const empireId = await getActiveEmpireId();
  // i18n-exempt: thrown, never rendered — the catch below returns the
  // translated "something went wrong" instead.
  if (empireId === null) throw new Error("לא מחובר");
  return empireId;
}

const drinkSchema = z.object({
  kind: z.enum([
    "DOUBLE_XP",
    "DOUBLE_RESOURCES",
    "HERO_INVULNERABLE",
    "FORGE_DISCOUNT",
  ]),
});

/**
 * Drink one potion from the belt: spend a bottle, open (or extend) its window.
 *
 * The settle-then-buff order matters for שיקוי השפע. applyPendingUpdates credits
 * *all* the production ticks that have piled up since the last settle, and it
 * has no idea when in that stretch the potion was drunk. Settling first means a
 * player who was away twelve hours banks those ticks at the plain rate, and only
 * the ticks that come after the sip are doubled — otherwise "log in, drink,
 * refresh" would double a whole night's mining.
 */
export async function drinkPotion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getT();
  const parsed = drinkSchema.safeParse({ kind: formData.get("kind") });
  if (!parsed.success) return { error: t("שיקוי לא תקין") };
  const { kind } = parsed.data;
  const meta = POTION_META[kind];

  try {
    const empireId = await requireOwnEmpireId();

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Empire" WHERE id = ${empireId} FOR UPDATE`;
      // Bank everything earned so far at the pre-potion rate — see above.
      await applyPendingUpdates(empireId, tx);
      const now = new Date();

      // Guarded debit: two taps on the button can never spend the same bottle
      // twice, and the count can never go negative.
      const spent = await tx.potionStack.updateMany({
        where: { empireId, kind, count: { gte: 1 } },
        data: { count: { decrement: 1 } },
      });
      if (spent.count === 0) {
        return { error: t("אין לך {potion} בתרמיל", { potion: t(meta.label) }) };
      }

      const existing = await tx.potionEffect.findUnique({
        where: { empireId_kind: { empireId, kind } },
        select: { expiresAt: true },
      });
      const extending = existing != null && existing.expiresAt > now;
      const expiresAt = potionExpiryAfterDrink(kind, now, existing?.expiresAt);

      await tx.potionEffect.upsert({
        where: { empireId_kind: { empireId, kind } },
        create: { empireId, kind, expiresAt },
        update: { expiresAt },
      });

      return {
        success: extending
          ? t("{potion} הוארך ב־{duration} נוספות!", {
              potion: t(meta.label),
              duration: potionDurationLabel(t, kind),
            })
          : t("{potion} פועל! {tagline} למשך {duration}.", {
              potion: t(meta.label),
              tagline: t(meta.tagline),
              duration: potionDurationLabel(t, kind),
            }),
      };
    });

    revalidatePath("/game", "layout");
    return result;
  } catch (err) {
    await logError("potions.drinkPotion", err);
    return { error: t("אירעה שגיאה, נסה שוב") };
  }
}
