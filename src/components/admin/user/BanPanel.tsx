"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, LabeledSelect } from "@/components/admin/fields";
import { banUser, unbanUser } from "@/server/actions/admin";
import { BAN_DAYS_MAX } from "@/lib/ban";

export interface BanPanelProps {
  userId: string;
  /** Live right now — a lapsed timed ban is not banned. */
  banned: boolean;
  /** Set while a ban row exists at all, live or lapsed. */
  hasBanRow: boolean;
  /** Pre-formatted on the server, so the markup does not depend on the viewer's clock. */
  bannedSince: string | null;
  bannedUntil: string | null;
  /** The active season, when there is one — the "until the season ends" option. */
  season: { name: string; endsAt: string } | null;
}

type Mode = "days" | "season" | "permanent";

const DEFAULT_DAYS = 7;

/**
 * The ban control: how long, not just whether.
 *
 * A ban is a punishment with a sentence, and the three lengths that matter here
 * are "a few days", "the rest of the season" (the competition the player was
 * caught cheating in) and "forever". The days field only shows for the option
 * that uses it — an admin should never wonder which box the server will read.
 */
export function BanPanel({
  userId,
  banned,
  hasBanRow,
  bannedSince,
  bannedUntil,
  season,
}: BanPanelProps) {
  const [mode, setMode] = useState<Mode>("days");
  const [days, setDays] = useState(String(DEFAULT_DAYS));

  const spanLabel =
    mode === "permanent"
      ? "לצמיתות"
      : mode === "season"
        ? `עד סוף העונה (${season?.endsAt ?? "—"})`
        : `ל-${days || DEFAULT_DAYS} ימים`;

  return (
    <div className="space-y-4">
      <div className="panel-inset rounded-lg p-3">
        <p className="text-xs text-zinc-400">
          מצב נוכחי:{" "}
          {banned ? (
            <span className="font-bold text-red-300">
              {bannedUntil ? `באן עד ${bannedUntil}` : "באן קבוע"}
            </span>
          ) : hasBanRow ? (
            <span className="font-bold text-amber-300">
              הבאן פג {bannedUntil ? `ב-${bannedUntil}` : ""} — השחקן פעיל
            </span>
          ) : (
            <span className="font-bold text-emerald-300">פעיל</span>
          )}
        </p>
        {bannedSince && (
          <p className="mt-1 text-[11px] text-zinc-500">ניתן בתאריך {bannedSince}</p>
        )}
      </div>

      <ActionForm
        action={banUser}
        submitLabel={banned ? "עדכן משך באן" : "תן באן"}
        submitVariant="danger"
        confirm={`לתת באן למשתמש ${spanLabel}? הוא לא יוכל להתחבר.`}
      >
        <input type="hidden" name="userId" value={userId} />
        <LabeledSelect
          label="משך הבאן"
          name="mode"
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          options={[
            { value: "days", label: "מספר ימים" },
            {
              value: "season",
              label: season ? `עד סוף העונה — ${season.name}` : "עד סוף העונה (אין עונה פעילה)",
            },
            { value: "permanent", label: "לצמיתות" },
          ]}
        />
        {mode === "days" && (
          <LabeledInput
            label="ימים"
            name="days"
            type="number"
            min={1}
            max={BAN_DAYS_MAX}
            value={days}
            onValueChange={setDays}
            hint={`1–${BAN_DAYS_MAX} ימים מרגע ההטלה`}
          />
        )}
        {mode === "season" && (
          <p className="text-[11px] text-zinc-500">
            {season
              ? `הבאן יפוג עם סיום העונה, ב-${season.endsAt}.`
              : "אין עונה פעילה — בחר משך אחר."}
          </p>
        )}
        {mode === "permanent" && (
          <p className="text-[11px] text-zinc-500">באן ללא תאריך תפוגה — עד להסרה ידנית.</p>
        )}
      </ActionForm>

      {hasBanRow && (
        <ActionForm action={unbanUser} submitLabel="הסר באן" submitVariant="secondary">
          <input type="hidden" name="userId" value={userId} />
        </ActionForm>
      )}
    </div>
  );
}
