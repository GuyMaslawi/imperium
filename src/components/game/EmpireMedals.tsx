import { Icon } from "@/components/ui/Icon";
import { getT } from "@/i18n/server";
import type { MedalView } from "@/lib/game/achievements";

/**
 * שיאי עולם — the world records an empire holds, at the top of its profile.
 *
 * Only the five capstones on the records board can reach this case, and only
 * for the one empire that got to each of them first (see selectWorldMedals). It
 * is a display case, not a checklist: no empty sockets, no progress bars, and a
 * dossier holding no record renders nothing at all — the page drops the column
 * entirely. That is what makes a column that *is* there mean something at a
 * glance. It used to list every capstone the empire had reached, which every
 * late-game dossier wore identically and which therefore said nothing.
 *
 * Every plate is crowned, haloed and throwing sparks, because every plate here
 * is a record: the quiet register the case used to have was for the ordinary
 * milestones that no longer appear.
 *
 * Server-rendered on purpose. Every bit of the movement below is CSS — a sheen
 * keyframe, a halo, three orbiting sparks — so the most-opened page in the game
 * ships no JavaScript for it, and the whole thing is inert under
 * prefers-reduced-motion.
 */

/** Where the sparks sit around a medal, in degrees + delay. */
const SPARKS = [
  { angle: -34, delay: "0s" },
  { angle: 88, delay: "1.1s" },
  { angle: 206, delay: "1.9s" },
];

export async function EmpireMedals({
  items,
  isMe,
  className = "",
}: {
  items: MedalView[];
  /** Changes the caption only — the wall itself reads the same either way. */
  isMe: boolean;
  /** Where the column sits; the case itself has no opinion about its width. */
  className?: string;
}) {
  const t = await getT();
  return (
    <aside className={`medal-case ${className}`}>
      <div className="medal-case-head">
        <h2 className="medal-case-title">
          <Icon name="crown" size={18} className="text-gold-bright" />
          {t("שיאי עולם")}
        </h2>
        <p className="medal-case-sub">
          {isMe
            ? t("הישגים שאתה הראשון בעולם שהגיע אליהם")
            : t("הישגים שהאימפריה הזו הראשונה בעולם שהגיעה אליהם")}
        </p>
      </div>

      <ul className="medal-list">
        {items.map((m, i) => (
          <li
            key={m.key}
            className="medal is-crowned"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="medal-disc" aria-hidden>
              <span className="medal-disc-face">
                <Icon name={m.icon} size={22} />
              </span>
              {SPARKS.map((s) => (
                <span
                  key={s.angle}
                  className="medal-spark"
                  style={
                    { "--a": `${s.angle}deg`, "--d": s.delay } as React.CSSProperties
                  }
                />
              ))}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="medal-name">{t(m.name, m.params)}</h3>
              <p className="medal-tagline">{t(m.tagline, m.params)}</p>
              <p className="medal-first">
                <Icon name="crown" size={12} className="shrink-0" />
                {t("ראשון בעולם")}
              </p>
              {/* dir="ltr" on the digits, never on the block: on the block it
                  drags the whole line to the physical left while every other
                  line of the plate starts on the right. */}
              <p className="medal-date nums">
                <span dir="ltr">{m.earnedLabel}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="medal-case-foot">
        <span className="nums font-bold text-gold-bright" dir="ltr">
          {items.length}
        </span>{" "}
        {items.length === 1 ? t("שיא עולם") : t("שיאי עולם")}
      </p>
    </aside>
  );
}
