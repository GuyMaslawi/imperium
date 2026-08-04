import { setLocale } from "@/server/actions/locale";
import { Icon } from "@/components/ui/Icon";
import { getLocale } from "@/i18n/server";
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT } from "@/i18n/locale";

/**
 * The language switch: one pill per language, the current one lit.
 *
 * A plain server component wrapping a form, with no client JavaScript at all.
 * Two reasons that matters more here than usual:
 *
 *  - it is the control a player reaches for when the page is in a language they
 *    cannot read, which is exactly when they should not also be waiting on a
 *    bundle to hydrate;
 *  - it is on the login and landing screens, which is the first paint of the
 *    whole site.
 *
 * Both languages are shown rather than a single toggle to "the other one". A
 * toggle has to be understood before it can be used — and its label is, by
 * construction, in the language the reader may not have. Two named buttons with
 * one visibly selected needs no reading at all.
 */
export async function LanguageSwitch({
  /** Compact form for the command bar: codes only, no full names. */
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const current = await getLocale();

  return (
    <form
      action={setLocale}
      // Always LTR: this is a row of language names, not prose, and its order
      // should not flip when the site does — the switch is the one control that
      // has to look the same in both directions to stay recognisable.
      dir="ltr"
      className={`flex shrink-0 items-center gap-0.5 rounded-lg border border-border-subtle bg-black/30 p-0.5 ${className}`}
    >
      {!compact && (
        <Icon
          name="language"
          size={16}
          className="mx-1 shrink-0 text-gold-dim"
          aria-hidden
        />
      )}
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            // `aria-current`, not `disabled`: the active language stays
            // focusable and announced, and pressing it is a harmless no-op.
            aria-current={active ? "true" : undefined}
            title={LOCALE_LABEL[locale]}
            className={`rounded-md px-2 py-1 text-xs font-black transition-colors ${
              active
                ? "bg-gold/20 text-gold-bright"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            {compact ? LOCALE_SHORT[locale] : LOCALE_LABEL[locale]}
          </button>
        );
      })}
    </form>
  );
}
