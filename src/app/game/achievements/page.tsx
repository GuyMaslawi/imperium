import type { CSSProperties } from "react";
import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon, type IconName } from "@/components/ui/Icon";
import { AchievementList } from "@/components/game/AchievementList";
import { getAchievementsState } from "@/server/achievementState";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("הישגים | KRALDOR") };
}

/** Dust settling through the case — fixed, so SSR and hydration agree. */
const CASE_DUST = [
  { x: "18%", d: "0s", dur: "8s" },
  { x: "35%", d: "2.2s", dur: "9.5s" },
  { x: "57%", d: "1.4s", dur: "8.5s" },
  { x: "72%", d: "3.6s", dur: "10s" },
  { x: "88%", d: "0.9s", dur: "9s" },
];

/** The three medals on the shelf. Purely a device for the light to catch. */
const SHELF: IconName[] = ["crown", "rankings", "gift"];

export default async function AchievementsPage() {
  // Settles the empire's pending updates before the conditions are evaluated,
  // so a milestone crossed by an update the player has not collected yet
  // (citizens, production) already counts on this load.
  const empire = await requireEmpire();
  const t = await getT();

  const state = await getAchievementsState(empire.id);
  if (!state) return null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title={t("הישגים")}
        ornament={<Icon name="rankings" size={22} className="text-crimson" />}
      />

      {/* -------- the display case --------
          Scenery, with one thing in it that is not: the medals are lit only
          while a reward is actually waiting to be collected, so the case is
          dark on a screen where there is nothing to do. */}
      <div className="panel-gold tro-case mx-auto max-w-5xl rounded-2xl p-4">
        <span className="tro-dust" aria-hidden>
          {CASE_DUST.map((speck) => (
            <span
              key={speck.x}
              style={{ "--x": speck.x, "--d": speck.d, "--dur": speck.dur } as CSSProperties}
            />
          ))}
        </span>

        <div className="tro-body text-center">
          <h2 className="flex items-center justify-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="achievements" size={20} className="text-crimson-bright" />
            {t("היכל הפרסים")}
          </h2>

          <div className="mt-3 flex items-center justify-center gap-5">
            {SHELF.map((icon, index) => (
              <span
                key={icon}
                aria-hidden
                style={{ "--i": index } as CSSProperties}
                className={`tro-medal grid h-12 w-12 place-items-center rounded-full border bg-panel-inset ${
                  state.collectable > 0
                    ? "is-lit border-gold text-gold-bright"
                    : "border-white/10 text-zinc-600"
                }`}
              >
                <Icon name={icon} size={22} />
              </span>
            ))}
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            {state.collectable > 0 ? (
              <>
                <span className="nums font-bold text-gold-bright" dir="ltr">
                  {state.collectable}
                </span>{" "}
                {t("פרסים מחכים על המדף")}
              </>
            ) : (
              <>
                <span className="nums font-bold text-gold-bright" dir="ltr">
                  {state.claimed}/{state.total}
                </span>{" "}
                {t("הישגים בהיכל — אין מה לאסוף כרגע")}
              </>
            )}
          </p>
        </div>
      </div>

      <AchievementList state={state} />
    </div>
  );
}
