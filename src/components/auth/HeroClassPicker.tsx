"use client";

import { useState } from "react";
import type { HeroClass } from "@prisma/client";
import {
  HERO_CLASS_META,
  HERO_CLASS_ORDER,
  heroClassBonusLines,
  heroClassImage,
} from "@/lib/game/hero";
import { LivingPortrait } from "@/components/game/LivingPortrait";
import { useT } from "@/i18n/client";

/**
 * Visual character picker for signup/onboarding: one card per hero class with
 * its portrait, name and passive bonus. Submits as a radio group named
 * `heroClass`, so the surrounding <form> posts the chosen class with no extra
 * wiring. Marked required so the browser blocks submit until one is chosen.
 */
export function HeroClassPicker() {
  const t = useT();
  const [selected, setSelected] = useState<HeroClass | null>(null);

  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold text-zinc-300">
        {t("בחר את הגיבור שלך")}
      </legend>
      <p className="mb-3 text-xs text-zinc-500">
        {t("לכל דמות יתרון קבוע משלה — הבחירה מלווה את האימפריה שלך לאורך הדרך.")}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {HERO_CLASS_ORDER.map((key, i) => {
          const meta = HERO_CLASS_META[key];
          const isSelected = selected === key;
          return (
            <label
              key={key}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-150 ${
                isSelected
                  ? "border-gold shadow-[0_0_18px_rgba(196,160,50,0.35)]"
                  : "border-border-subtle hover:border-border-gold-strong"
              }`}
            >
              <input
                type="radio"
                name="heroClass"
                value={key}
                required
                checked={isSelected}
                onChange={() => setSelected(key)}
                className="sr-only"
              />
              {/* All four breathe, on deliberately mismatched cycles so the row
                  never pulses in unison. The rest — embers, the pointer lean,
                  the depth upgrade — is held back for the card being chosen,
                  which keeps the signup page to one GL context instead of four
                  and makes the selection itself read as the portrait waking. */}
              <LivingPortrait
                src={heroClassImage(key)}
                alt={meta.label}
                className="block aspect-[2/3] w-full bg-panel-inset"
                accent={meta.accent}
                embers={isSelected ? 5 : 0}
                tilt={isSelected ? 7 : 0}
                drift={27 + i * 4}
                halo={isSelected}
                rich={isSelected}
              />
              {/* bottom gradient with name + bonus */}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-2 pb-1.5 pt-6 text-center">
                <span className="block text-sm font-black text-gold-bright">
                  {meta.label}
                </span>
                {heroClassBonusLines(key).map((line) => (
                  <span
                    key={line.label}
                    className="block text-[10px] font-bold leading-4 text-emerald-300"
                  >
                    {line.icon} {line.label}{" "}
                    <span className="nums" dir="ltr">
                      +{line.pct}%
                    </span>
                  </span>
                ))}
              </span>
              {/* selected check */}
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-black text-black shadow">
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>
      {selected && (
        <p className="mt-2 text-center text-xs text-zinc-400">
          {HERO_CLASS_META[selected].description}
        </p>
      )}
    </fieldset>
  );
}
