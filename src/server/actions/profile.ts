"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveEmpireId } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { normalizeBio } from "@/lib/game/profile";
import type { ActionState } from "./game";
import { logError } from "@/server/errorLog";
import { getT } from "@/i18n/server";

/** Rewrites allowed per window. Generous for editing, useless for cycling slurs. */
const BIO_SAVE_LIMIT = 12;
const BIO_SAVE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Write (or clear) the blurb on your own dossier.
 *
 * There is no target parameter on purpose: the only profile this can touch is
 * the caller's own, resolved server-side. `getActiveEmpireId` is the same
 * accessor every other action uses, which means it enforces the ban and honours
 * impersonation — an admin walking an account can clear an abusive blurb the
 * same way its owner would, which is the moderation path for this field.
 *
 * The submitted text is normalised rather than validated: over-long input is cut
 * to BIO_MAX instead of rejected, so a paste that runs past the cap saves the
 * part that fits rather than losing the lot. Only the *shape* is enforced — see
 * normalizeBio, which is about layout, never about what a player is allowed to
 * say about themselves.
 *
 * Empty stores NULL, never "": the column is read as "did they write anything",
 * and a blank string would answer yes.
 */
export async function saveEmpireBio(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = await getT();
  const empireId = await getActiveEmpireId();
  if (empireId === null) return { error: t("לא מחובר") };

  if (
    !(await rateLimit(`bio:${empireId}`, BIO_SAVE_LIMIT, BIO_SAVE_WINDOW_MS))
  ) {
    return {
      error: t("ערכת את התיאור יותר מדי פעמים — נסה שוב בעוד כמה דקות"),
    };
  }

  const bio = normalizeBio(String(formData.get("bio") ?? ""));

  try {
    await prisma.empire.update({
      where: { id: empireId },
      data: { bio: bio === "" ? null : bio },
    });
    // The blurb renders on one page — this player's own dossier.
    revalidatePath(`/game/empires/${empireId}`);
    return {
      success: bio === "" ? t("התיאור נמחק") : t("התיאור נשמר"),
    };
  } catch (err) {
    await logError("profile.saveEmpireBio", err);
    return { error: t("אירעה שגיאה, נסה שוב") };
  }
}
