/**
 * "45 דק׳" / "3 שעות" / "יום שלם" — a Happy Hour length as an admin says it
 * out loud.
 *
 * Only the control centre ever prints a duration this way: players see the
 * window's end time, not its length. It lives under `components/admin/` rather
 * than beside the Happy Hour rules for the same reason `tunableMeta.ts` does —
 * the control centre stays Hebrew on purpose, and the i18n coverage report
 * reads that boundary off the file tree.
 *
 * A plain module, not a "use client" one: the admin *list* renders on the
 * server, and a helper exported from a client module reaches a server component
 * as a client reference, which throws when called.
 */
export function durationLabel(minutes: number): string {
  if (minutes <= 0) return "ללא הגבלה";
  if (minutes < 60) return `${minutes} דק׳`;
  if (minutes === 1440) return "יום שלם";
  const hours = Number((minutes / 60).toFixed(1));
  if (hours === 1) return "שעה";
  if (hours === 2) return "שעתיים";
  return `${hours} שעות`;
}
