"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { LabeledInput } from "@/components/admin/fields";
import {
  HAPPY_HOUR_DEFAULT_TITLE,
  HAPPY_HOUR_DURATIONS,
  HAPPY_HOUR_EFFECTS,
  HAPPY_HOUR_MAX_MINUTES,
  HAPPY_HOUR_MAX_PCT,
  HAPPY_HOUR_MIN_PCT,
  HAPPY_HOUR_PRESETS,
  durationLabel,
  multiplierLabel,
} from "@/lib/game/happyHour";
import type { AdminActionState } from "@/server/actions/admin";

type Action = (
  prev: AdminActionState,
  formData: FormData
) => Promise<AdminActionState>;

/**
 * The launcher: pick a bonus, pick a length, hit the big button, and every
 * player in the world is playing a different game a second later.
 *
 * Deliberately one screen with one primary action. The bonus and the duration
 * are chip pickers with a free-text field behind them, because the common case
 * is "×2 for an hour" and the rare case is "×3.5 for 90 minutes" — neither
 * should cost more than a click and a number.
 */
export function HappyHourLauncher({ action }: { action: Action }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {});
  const [bonusPct, setBonusPct] = useState(100);
  const [minutes, setMinutes] = useState(60);
  const [effects, setEffects] = useState({
    boostXp: true,
    boostPlunder: true,
    boostMines: true,
  });

  const nothingOn = !effects.boostXp && !effects.boostPlunder && !effects.boostMines;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="activate" value="1" />
      <input type="hidden" name="bonusPct" value={bonusPct} />
      <input type="hidden" name="durationMinutes" value={minutes} />
      {HAPPY_HOUR_EFFECTS.map((effect) => (
        <input
          key={effect.key}
          type="hidden"
          name={effect.key}
          value={effects[effect.key] ? "1" : "0"}
        />
      ))}

      {/* ── The number, the size of the decision it is ── */}
      <div className="hh-admin-preview rounded-xl p-5 text-center">
        <p className="text-[11px] font-bold tracking-[0.3em] text-gold-dim">מה כולם מקבלים</p>
        <p className="hh-admin-mult nums leading-none" dir="ltr">
          {multiplierLabel(bonusPct)}
        </p>
        <p className="text-sm font-bold text-gold-bright">
          {nothingOn ? "בחר לפחות הטבה אחת" : `על ${effects.boostXp && effects.boostPlunder && effects.boostMines ? "הכל" : "ההטבות שבחרת"} · ${durationLabel(minutes)}`}
        </p>
      </div>

      {/* ── Bonus ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gold-dim">עוצמת הבונוס</p>
        <div className="flex flex-wrap gap-2">
          {HAPPY_HOUR_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setBonusPct(pct)}
              className={`nums rounded-lg border px-4 py-2 text-base font-black transition-colors ${
                bonusPct === pct
                  ? "border-gold bg-gold/15 text-gold-bright"
                  : "border-border-subtle bg-panel-inset text-zinc-300 hover:border-gold-dim"
              }`}
              dir="ltr"
            >
              {multiplierLabel(pct)}
            </button>
          ))}
          <div className="w-44">
            {/* The real value rides the hidden field above; this is the escape
                hatch for a bonus that isn't one of the presets. */}
            <LabeledInput
              label="מותאם אישית"
              name="bonusPctManual"
              type="number"
              min={HAPPY_HOUR_MIN_PCT}
              max={HAPPY_HOUR_MAX_PCT}
              value={String(bonusPct)}
              onValueChange={(v) => setBonusPct(Number(v) || 0)}
              hint={`% תוספת (100 = כפול), עד ${HAPPY_HOUR_MAX_PCT}`}
            />
          </div>
        </div>
      </div>

      {/* ── Duration ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gold-dim">כמה זמן זה רץ</p>
        <div className="flex flex-wrap gap-2">
          {HAPPY_HOUR_DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                minutes === m
                  ? "border-gold bg-gold/15 text-gold-bright"
                  : "border-border-subtle bg-panel-inset text-zinc-300 hover:border-gold-dim"
              }`}
            >
              {durationLabel(m)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMinutes(0)}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
              minutes === 0
                ? "border-gold bg-gold/15 text-gold-bright"
                : "border-border-subtle bg-panel-inset text-zinc-300 hover:border-gold-dim"
            }`}
          >
            ∞ עד שאעצור
          </button>
          <div className="w-44">
            <LabeledInput
              label="מותאם אישית"
              name="durationMinutesManual"
              type="number"
              min={0}
              max={HAPPY_HOUR_MAX_MINUTES}
              value={String(minutes)}
              onValueChange={(v) => setMinutes(Math.max(0, Number(v) || 0))}
              hint="דקות (0 = ללא הגבלה)"
            />
          </div>
        </div>
      </div>

      {/* ── What it bends ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gold-dim">על מה זה חל</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {HAPPY_HOUR_EFFECTS.map((effect) => {
            const on = effects[effect.key];
            return (
              <button
                key={effect.key}
                type="button"
                onClick={() => setEffects((prev) => ({ ...prev, [effect.key]: !on }))}
                className={`rounded-lg border p-3 text-right transition-colors ${
                  on
                    ? "border-gold bg-gold/12"
                    : "border-border-subtle bg-panel-inset opacity-60 hover:opacity-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-xl">
                    {effect.icon}
                  </span>
                  <span
                    className={`text-sm font-black ${on ? "text-gold-bright" : "text-zinc-400"}`}
                  >
                    {effect.label}
                  </span>
                  <span className="mr-auto text-xs font-bold text-zinc-500">
                    {on ? "פעיל" : "כבוי"}
                  </span>
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-zinc-500">
                  {effect.detail}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <LabeledInput
        label="שם האירוע (רשות)"
        name="title"
        placeholder={HAPPY_HOUR_DEFAULT_TITLE}
        hint="מה שיוקרן על המסך של כל שחקן"
      />

      <SubmitButton className="w-full py-3 text-base">
        🔥 שחרר לכל השחקנים עכשיו
      </SubmitButton>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
