import { Icon } from "@/components/ui/Icon";
import type { MedalView } from "@/lib/game/achievements";

/**
 * אותות כבוד — the case of medals down the side of an empire's profile.
 *
 * Only the eleven milestones in MEDAL_KEYS reach this wall, and only once
 * earned: it is a display case, not a checklist, so there are no empty sockets
 * and no progress bars. A dossier with nothing on it renders nothing at all
 * (the page drops the column), which is what makes a column that *is* there
 * mean something at a glance.
 *
 * Three registers of loudness, same rule as the world-records board: a medal
 * whose world record this empire *holds* is crowned, haloed and throws sparks;
 * every other earned medal glows quietly; and the case itself carries one slow
 * band of light so the whole column reads as lit rather than decorated.
 *
 * Server-rendered on purpose. Every bit of the movement below is CSS — a sheen
 * keyframe, a halo, three orbiting sparks — so the most-opened page in the game
 * ships no JavaScript for it, and the whole thing is inert under
 * prefers-reduced-motion.
 */

/** Where the sparks sit around a crowned medal, in degrees + delay. */
const SPARKS = [
  { angle: -34, delay: "0s" },
  { angle: 88, delay: "1.1s" },
  { angle: 206, delay: "1.9s" },
];

export function EmpireMedals({
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
  const crowned = items.filter((m) => m.worldFirst).length;

  return (
    <aside className={`medal-case ${className}`}>
      <div className="medal-case-head">
        <h2 className="medal-case-title">
          <Icon name="achievements" size={18} className="text-gold-bright" />
          אותות כבוד
        </h2>
        <p className="medal-case-sub">
          {crowned > 0
            ? isMe
              ? "ההישגים הראשיים שלך — ובראשם שיא עולם על שמך"
              : "ההישגים הראשיים שלו — ובראשם שיא עולם על שמו"
            : isMe
              ? "ההישגים הראשיים שהשגת"
              : "ההישגים הראשיים שהאימפריה הזו כבשה"}
        </p>
      </div>

      <ul className="medal-list">
        {items.map((m, i) => (
          <li
            key={m.key}
            className={`medal ${m.worldFirst ? "is-crowned" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className="medal-disc" aria-hidden>
              <span className="medal-disc-face">
                <Icon name={m.icon} size={22} />
              </span>
              {m.worldFirst &&
                SPARKS.map((s) => (
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
              <h3 className="medal-name">{m.name}</h3>
              <p className="medal-tagline">{m.tagline}</p>
              {/* The world-record line is the only thing on this wall that is
                  about the rest of the server rather than about him. */}
              {m.worldFirst && (
                <p className="medal-first">
                  <Icon name="crown" size={12} className="shrink-0" />
                  ראשון בעולם
                </p>
              )}
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
        <span className="nums font-bold text-gold" dir="ltr">
          {items.length}
        </span>{" "}
        {items.length === 1 ? "אות כבוד" : "אותות כבוד"}
        {crowned > 0 && (
          <>
            {" · "}
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {crowned}
            </span>{" "}
            {crowned === 1 ? "שיא עולם" : "שיאי עולם"}
          </>
        )}
      </p>
    </aside>
  );
}
