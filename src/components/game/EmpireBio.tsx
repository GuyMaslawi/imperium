"use client";

import { useActionState, useState } from "react";
import { saveEmpireBio } from "@/server/actions/profile";
import type { ActionState } from "@/server/actions/game";
import { BIO_MAX } from "@/lib/game/profile";
import { charCount, clampChars } from "@/lib/game/text";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { useT } from "@/i18n/client";

/**
 * The player's own words, under the records case on their dossier.
 *
 * Everything else on this page is derived — a hero the game levelled, records
 * the game stamped, a plunder ledger the game kept. This is the one line of it
 * the player writes, which is why it sits in the same column as the honours
 * rather than at the bottom of the page.
 *
 * Two components in one, and deliberately so: the read view is what a visitor
 * sees and the editor is the same panel with the text swapped for a textarea,
 * so writing happens where the writing shows rather than behind a settings
 * screen. On somebody else's dossier there is no editor at all — the action
 * ignores any target it is handed and only ever writes the caller's own row, so
 * this is a UI convenience over a server rule rather than the rule itself.
 *
 * Rendered as plain text with `whitespace-pre-line`: line breaks survive, and
 * nothing else does. There is no markup path here and there must not be one —
 * this string is written by one player and read by every other.
 */
export function EmpireBio({
  bio,
  isMe,
  className = "",
}: {
  bio: string | null;
  /** Only the owner gets an editor; everybody else gets the text. */
  isMe: boolean;
  className?: string;
}) {
  const t = useT();
  const [state, action] = useActionState<ActionState, FormData>(
    saveEmpireBio,
    {}
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");

  // A saved blurb closes the editor and leaves the confirmation under the text.
  // Adjusted during render rather than in an effect: an effect that calls
  // setState runs a second render pass for every result, and this is the
  // sanctioned shape for "react to a value that changed". `useActionState`
  // hands back a fresh object per submission, so the comparison fires once per
  // save — a failed one keeps the editor open with the text still in it, and
  // merely reopening the editor later does not re-trigger anything.
  const [lastResult, setLastResult] = useState(state);
  if (lastResult !== state) {
    setLastResult(state);
    if (state.success) setEditing(false);
  }

  // Nothing written and nobody to write it: the page drops the panel entirely
  // rather than showing a visitor an empty box.
  if (!isMe && !bio) return null;

  const left = BIO_MAX - charCount(draft);

  return (
    <section className={`panel rounded-xl p-4 ${className}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
          <Icon name="reports" size={16} className="text-gold" />
          {isMe ? t("התיאור שלי") : t("דברי השחקן")}
        </h2>
        {isMe && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(bio ?? "");
              setEditing(true);
            }}
            className="cursor-pointer text-xs font-semibold text-gold hover:text-gold-bright"
          >
            {bio ? t("ערוך") : t("כתוב תיאור")}
          </button>
        )}
      </div>

      {editing ? (
        <form action={action} className="space-y-2">
          <textarea
            name="bio"
            rows={6}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(clampChars(e.target.value, BIO_MAX))}
            placeholder={t("מי אתה, בשביל מה אתה משחק, ולמי כדאי לא להתעסק איתך…")}
            className="w-full resize-y rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
          />
          <p className="text-[11px] text-zinc-500">
            {t("נותרו")}{" "}
            <span className="nums font-bold text-zinc-300" dir="ltr">
              {left}
            </span>{" "}
            {t("תווים · התיאור גלוי לכל שחקן שנכנס לפרופיל שלך")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton pendingText={t("שומר...")}>{t("שמור")}</SubmitButton>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(bio ?? "");
              }}
              className="btn btn-ghost px-3 py-2 text-sm"
            >
              {t("ביטול")}
            </button>
          </div>
        </form>
      ) : bio ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
          {bio}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          {t("עוד לא כתבת כלום על עצמך. כל מי שנכנס לפרופיל שלך יראה כאן את מה שתכתוב.")}
        </p>
      )}

      {/* Outside the form on purpose: the editor closes on a successful save,
          and the confirmation has to survive it. */}
      {isMe && (
        <div className="mt-2 empty:mt-0">
          <FormMessage error={state.error} success={state.success} />
        </div>
      )}
    </section>
  );
}
