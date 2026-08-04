import { splitBreakHours, type BreakUnit } from "@/lib/game/seasonCycle";

/**
 * How a break between seasons is written down for an admin.
 *
 * Only the control centre says a break's *length* out loud — a player sees the
 * countdown to the next opening, never "3 ימים". So both of these live under
 * `components/admin/` alongside `tunableMeta.ts` and `happyHourDuration.ts`:
 * the control centre stays Hebrew on purpose, and the i18n coverage report
 * reads that boundary off the file tree.
 *
 * The arithmetic itself (`splitBreakHours`, `breakToHours`) stays in
 * `lib/game/seasonCycle.ts` — it is the rule, and the rule is not language.
 */

export const BREAK_UNITS: { value: BreakUnit; label: string }[] = [
  { value: "minutes", label: "דקות" },
  { value: "hours", label: "שעות" },
  { value: "days", label: "ימים" },
];


/**
 * The break as a Hebrew phrase — for the admin's own summary line and the audit
 * log, both of which are read by a person rather than parsed.
 *
 * Hebrew counts one and two differently from everything else ("יום אחד",
 * "יומיים", "3 ימים"), and a panel that says "1 ימים" reads as a bug in the
 * panel even when the number behind it is right.
 */
export function formatBreakHours(hours: number): string {
  if (hours <= 0) return "ללא הפסקה";
  const { value, unit } = splitBreakHours(hours);
  const rounded = Number(value.toFixed(2));
  const forms: Record<BreakUnit, [string, string, string]> = {
    minutes: ["דקה אחת", "שתי דקות", "דקות"],
    hours: ["שעה אחת", "שעתיים", "שעות"],
    days: ["יום אחד", "יומיים", "ימים"],
  };
  const [one, two, many] = forms[unit];
  if (rounded === 1) return one;
  if (rounded === 2) return two;
  return `${rounded} ${many}`;
}
