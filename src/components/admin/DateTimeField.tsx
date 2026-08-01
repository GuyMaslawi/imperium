"use client";

import { useState, useSyncExternalStore } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-gold/60";

const CHIP_CLASS =
  "rounded-md border border-border-subtle bg-panel-inset px-2 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-gold-dim hover:text-gold-bright";

/* ------------------------------ time helpers ------------------------------ */

/** Format an instant as the value an `<input type="datetime-local">` expects. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse a `datetime-local` value into the instant the admin meant.
 *
 * Only ever called in the browser. A zoneless "YYYY-MM-DDTHH:mm" is local time
 * by spec, so the browser — which shares the admin's timezone — is the only
 * place this string can be turned into an instant correctly. The server sees an
 * absolute ISO string instead (see the hidden field below).
 */
function fromLocalInput(local: string): Date | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Now, floored to the minute — the granularity of the input's own steps. */
function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return toLocalInput(d);
}

function shiftLocal(local: string, ms: number): string {
  const d = fromLocalInput(local) ?? new Date();
  return toLocalInput(new Date(d.getTime() + ms));
}

/** The next occurrence of `hour:00`, tomorrow if today's has passed. */
function nextAtHour(hour: number): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  if (d.getHours() >= hour) d.setDate(d.getDate() + 1);
  d.setHours(hour);
  return toLocalInput(d);
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/* ------------------------------- the clock -------------------------------- */

/**
 * The clock as an external store, ticked once for the whole page.
 *
 * A store rather than a `useState` + interval per field: `getSnapshot` must
 * return a cached value, which is exactly what makes every field on the page
 * agree on what "now" is, and the interval only exists while something is
 * subscribed.
 */
const TICK_MS = 15_000;
let clockSnapshot = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeToClock(onChange: () => void): () => void {
  clockListeners.add(onChange);
  clockTimer ??= setInterval(() => {
    clockSnapshot = Date.now();
    for (const listener of clockListeners) listener();
  }, TICK_MS);
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

function readClock(): number {
  if (clockSnapshot === 0) clockSnapshot = Date.now();
  return clockSnapshot;
}

/**
 * The clock, or `null` on the server render and during hydration.
 *
 * Nothing here may read the clock while rendering on the server: every string
 * below is formatted in the *viewer's* timezone, and the server's is UTC in
 * production, so rendering them on both sides would guarantee a mismatch.
 * `null` means "no timezone known yet", and every time-dependent line is gated
 * on it.
 */
function useNow(): number | null {
  return useSyncExternalStore(subscribeToClock, readClock, () => null);
}

const ABSOLUTE_FMT = new Intl.DateTimeFormat("he-IL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** "בעוד 3 ימים" / "לפני שעה" / "עכשיו". */
function relativeLabel(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return "עכשיו";
  const rtf = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
  if (abs >= DAY) return rtf.format(Math.round(ms / DAY), "day");
  if (abs >= HOUR) return rtf.format(Math.round(ms / HOUR), "hour");
  return rtf.format(Math.round(ms / MINUTE), "minute");
}

/** "30 ימים ו־4 שעות" — the span between two instants. */
function durationLabel(ms: number): string {
  if (ms <= 0) return "";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const parts: string[] = [];
  if (days) parts.push(days === 1 ? "יום" : `${days} ימים`);
  if (hours) parts.push(hours === 1 ? "שעה" : `${hours} שעות`);
  if (!days && minutes) parts.push(minutes === 1 ? "דקה" : `${minutes} דקות`);
  return parts.join(" ו־") || "פחות מדקה";
}

/* ------------------------------- the field -------------------------------- */

export type DateTimePreset = { label: string; value: () => string };

/**
 * A date+time field for admin forms: the native picker for an arbitrary
 * instant, one-tap chips for the instants an admin actually wants ("עכשיו"),
 * and a plain-Hebrew readout of what is currently selected.
 *
 * It submits an **absolute ISO instant** through a hidden field rather than the
 * input's own zoneless value, so a UTC server stores the moment the admin
 * picked instead of the same wall-clock reading three hours off.
 */
export function DateTimeField({
  label,
  name,
  value,
  onChange,
  onPresetPick,
  presets = [],
  required,
  hint,
  invalid,
}: {
  label: string;
  name: string;
  /** The picked wall-clock time, as a `datetime-local` value ("" = unset). */
  value: string;
  onChange: (value: string) => void;
  /** Handler for a chip, when picking one should do more than typing it does. */
  onPresetPick?: (value: string) => void;
  presets?: DateTimePreset[];
  required?: boolean;
  hint?: string;
  /** Message shown in place of the readout when the pick is rejected. */
  invalid?: string;
}) {
  const now = useNow();
  const picked = fromLocalInput(value);

  return (
    <div className="space-y-1.5">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-gold-dim">{label}</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          dir="ltr"
          className={`${INPUT_CLASS} [color-scheme:dark]`}
        />
      </label>

      {/* The real payload: an absolute instant. Rendered only once mounted —
          the string is timezone-derived, and a form driven by a server action
          cannot be submitted before hydration anyway. */}
      {now !== null && picked && (
        <input type="hidden" name={name} value={picked.toISOString()} />
      )}

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => (onPresetPick ?? onChange)(p.value())}
              className={CHIP_CLASS}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {invalid ? (
        <p className="text-[11px] font-semibold text-red-300">{invalid}</p>
      ) : now !== null && picked ? (
        <p className="text-[11px] text-zinc-500">
          <span className="text-zinc-300">{ABSOLUTE_FMT.format(picked)}</span>
          {" · "}
          {relativeLabel(picked.getTime() - now)}
        </p>
      ) : (
        hint && <p className="text-[11px] text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

/**
 * An instant, printed in the viewer's timezone.
 *
 * Blank until mounted, for the reason `useNow` explains: only the browser knows
 * which timezone "18:40" is supposed to mean.
 */
export function LocalTime({ iso }: { iso: string }) {
  const now = useNow();
  return (
    <span dir="ltr">
      {now === null ? "" : toLocalInput(new Date(iso)).replace("T", " ")}
    </span>
  );
}

/* ---------------------------- season schedule ----------------------------- */

const START_PRESETS: DateTimePreset[] = [
  { label: "עכשיו", value: nowLocal },
  { label: "בעוד שעה", value: () => shiftLocal(nowLocal(), HOUR) },
  { label: "מחר 20:00", value: () => nextAtHour(20) },
  { label: "בעוד שבוע", value: () => shiftLocal(nowLocal(), 7 * DAY) },
];

const LENGTHS: { label: string; ms: number }[] = [
  { label: "שבוע", ms: 7 * DAY },
  { label: "שבועיים", ms: 14 * DAY },
  { label: "חודש", ms: 30 * DAY },
  { label: "3 חודשים", ms: 90 * DAY },
];

const DEFAULT_LENGTH_MS = 30 * DAY;

/**
 * The start+end pair of a season.
 *
 * Owns both fields together so the end can be expressed as a *length* ("חודש")
 * rather than a second date, and so moving the start with a chip carries the
 * season length with it. Typing a start by hand leaves the end alone — a field
 * that jumps while you type it is worse than one you fix afterwards.
 */
export function SeasonSchedule({
  startISO,
  endISO,
}: {
  /** Existing season's start; absent = the "new season" form. */
  startISO?: string;
  endISO?: string;
}) {
  const now = useNow();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [seeded, setSeeded] = useState(false);

  // Seeded on the first render that knows the timezone — an ISO instant becomes
  // a wall-clock string only in the admin's own zone, so the server render
  // leaves both fields blank and this fills them in the moment `now` arrives.
  // (An update during render, not in an effect: it runs before paint, so the
  // fields are never briefly empty.)
  if (now !== null && !seeded) {
    setSeeded(true);
    // A new season starts now unless told otherwise — the common case, and the
    // one that would otherwise be typed out digit by digit.
    setStart(startISO ? toLocalInput(new Date(startISO)) : nowLocal());
    setEnd(
      endISO
        ? toLocalInput(new Date(endISO))
        : shiftLocal(nowLocal(), DEFAULT_LENGTH_MS)
    );
  }

  const startAt = fromLocalInput(start);
  const endAt = fromLocalInput(end);
  const span = startAt && endAt ? endAt.getTime() - startAt.getTime() : null;
  const backwards = span !== null && span <= 0;

  /** Move the start and drag the season along with it. */
  const moveStart = (next: string) => {
    const from = fromLocalInput(start);
    const to = fromLocalInput(next);
    if (from && to && span !== null && span > 0) {
      setEnd(shiftLocal(end, to.getTime() - from.getTime()));
    }
    setStart(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField
          label="התחלה"
          name="startsAt"
          value={start}
          onChange={setStart}
          onPresetPick={moveStart}
          required
          presets={START_PRESETS}
          hint="בחר מועד או לחץ ״עכשיו״"
        />
        <DateTimeField
          label="סיום"
          name="endsAt"
          value={end}
          onChange={setEnd}
          required
          presets={LENGTHS.map((l) => ({
            label: l.label,
            value: () => shiftLocal(start || nowLocal(), l.ms),
          }))}
          hint="או בחר משך עונה"
          invalid={backwards ? "הסיום חייב להיות אחרי ההתחלה" : undefined}
        />
      </div>

      {span !== null && span > 0 && (
        <p className="text-[11px] text-zinc-500">
          משך העונה: <span className="font-bold text-gold-dim">{durationLabel(span)}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------ ending early ------------------------------ */

const SHORTEN_PRESETS: DateTimePreset[] = [
  { label: "עכשיו", value: nowLocal },
  { label: "בעוד שעה", value: () => shiftLocal(nowLocal(), HOUR) },
  { label: "מחר 20:00", value: () => nextAtHour(20) },
  { label: "בעוד שבוע", value: () => shiftLocal(nowLocal(), 7 * DAY) },
];

/**
 * The end date of a running season, for cutting it short.
 *
 * One field rather than the full `SeasonSchedule`, because the start of a
 * season already under way is history and must not be editable. Its whole job
 * beyond the picker is telling the admin what the pick *means* — a date already
 * behind them ends the season on submit, which is a very different button from
 * "the season now ends on Tuesday".
 */
export function SeasonEndPicker({
  startISO,
  endISO,
}: {
  startISO: string;
  endISO: string;
}) {
  const now = useNow();
  const [end, setEnd] = useState("");
  const [seeded, setSeeded] = useState(false);

  // Seeded once the timezone is known — see SeasonSchedule.
  if (now !== null && !seeded) {
    setSeeded(true);
    setEnd(toLocalInput(new Date(endISO)));
  }

  const picked = fromLocalInput(end);
  const startAt = new Date(startISO).getTime();
  const currentEnd = new Date(endISO).getTime();
  const at = picked?.getTime() ?? null;

  const invalid =
    at === null || now === null
      ? undefined
      : at >= currentEnd
        ? "המועד חייב להיות מוקדם מהסיום הנוכחי — להארכה, ערוך את התאריכים למעלה"
        : at <= startAt
          ? "הסיום חייב להיות אחרי תחילת העונה"
          : undefined;

  const immediate = at !== null && now !== null && !invalid && at <= now;

  return (
    <div className="space-y-2">
      <DateTimeField
        label="סיום חדש"
        name="endsAt"
        value={end}
        onChange={setEnd}
        required
        presets={SHORTEN_PRESETS}
        hint="בחר מועד מוקדם יותר, או ״עכשיו״ כדי לסיים מיד"
        invalid={invalid}
      />
      {immediate ? (
        <p className="text-[11px] font-semibold text-red-300">
          המועד כבר עבר — העונה תיסגר מיד עם השליחה: הדירוג יישמר בהיכל התהילה
          והמשחק יינעל לכל השחקנים עד תחילת העונה הבאה.
        </p>
      ) : (
        at !== null &&
        now !== null &&
        !invalid && (
          <p className="text-[11px] text-zinc-500">
            נותר לעונה:{" "}
            <span className="font-bold text-gold-dim">{durationLabel(at - now)}</span>
            {" · "}
            <span className="text-zinc-600">
              במקום {durationLabel(currentEnd - now)}
            </span>
          </p>
        )
      )}
    </div>
  );
}
