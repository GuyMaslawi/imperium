"use client";

import { useActionState, useState } from "react";
import type { MiniGameType } from "@prisma/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { LabeledInput } from "@/components/admin/fields";
import type { AdminActionState } from "@/server/actions/admin";

type Action = (
  prev: AdminActionState,
  formData: FormData
) => Promise<AdminActionState>;

const TYPES: { value: MiniGameType; label: string; icon: string; hint: string }[] = [
  { value: "GUESS_NUMBER", label: "נחש את המספר", icon: "🔢", hint: "השחקנים מנחשים מספר בטווח" },
  { value: "FIND_BALL", label: "מצא את הכדור", icon: "🔮", hint: "השחקנים בוחרים כוס אחת" },
];

const PRIZE_FIELDS = [
  { name: "prizeGold", label: "🪙 זהב" },
  { name: "prizeWood", label: "🪵 עץ" },
  { name: "prizeIron", label: "⚙️ ברזל" },
  { name: "prizeStone", label: "🪨 אבן" },
  { name: "prizeDiamonds", label: "💎 יהלומים" },
  { name: "prizeCitizens", label: "👥 אזרחים" },
  { name: "prizeTurns", label: "⏳ תורות" },
  { name: "prizeWheelSpins", label: "🎡 סיבובים" },
] as const;

/**
 * A compact, type-aware creator for mini-games. The type toggle hides the
 * irrelevant config fields, the title defaults to the type name, and the
 * primary button both creates AND launches the game to everyone in one click.
 */
export function MiniGameCreator({ action }: { action: Action }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {});
  const [type, setType] = useState<MiniGameType>("GUESS_NUMBER");
  const meta = TYPES.find((t) => t.value === type)!;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />

      {/* Type picker */}
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map((t) => {
          const active = t.value === type;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-right transition-colors ${
                active
                  ? "border-gold bg-gold/12 text-gold-bright"
                  : "border-border-subtle bg-panel-inset text-zinc-300 hover:border-gold-dim hover:text-zinc-100"
              }`}
            >
              <span aria-hidden className="text-xl">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t.label}</span>
                <span className="block text-[11px] text-zinc-500">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Title (optional) + shared settings */}
      <div className="grid gap-3 sm:grid-cols-3">
        <LabeledInput
          label="כותרת (רשות)"
          name="title"
          placeholder={meta.label}
          hint="ריק = שם המשחק"
        />
        <LabeledInput label="ניסיונות לשחקן" name="maxAttempts" type="number" min={1} defaultValue={5} />
        <LabeledInput label="מקס׳ זוכים (0=∞)" name="maxWinners" type="number" min={0} defaultValue={0} />
      </div>

      {/* Type-specific config */}
      {type === "GUESS_NUMBER" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label="מינימום" name="min" type="number" defaultValue={1} />
          <LabeledInput label="מקסימום" name="max" type="number" defaultValue={100} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label="מספר כוסות" name="cups" type="number" min={2} defaultValue={3} hint="2–6" />
        </div>
      )}

      {/* Prize */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gold-dim">פרס לזוכים</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIZE_FIELDS.map((p) => (
            <LabeledInput key={p.name} label={p.label} name={p.name} type="number" min={0} placeholder="0" />
          ))}
        </div>
      </div>

      {/* Actions — launch is the primary path */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <SubmitButton name="activate" value="1" className="flex-1 sm:flex-none">
          🚀 צור והפעל מיד
        </SubmitButton>
        <SubmitButton name="activate" value="0" variant="secondary">
          שמור בלבד
        </SubmitButton>
      </div>

      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
