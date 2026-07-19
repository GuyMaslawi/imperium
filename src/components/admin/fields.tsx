import type { ReactNode } from "react";

const INPUT_CLASS =
  "w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-gold/60";

/** Labeled text/number input for admin forms. */
export function LabeledInput({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  min,
  placeholder,
  required,
  dir,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: "text" | "number" | "email" | "password" | "datetime-local";
  step?: number | string;
  min?: number | string;
  placeholder?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-gold-dim">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        dir={dir ?? (type === "number" ? "ltr" : undefined)}
        className={INPUT_CLASS}
      />
      {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

/** Labeled select for admin forms. */
export function LabeledSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-gold-dim">{label}</span>
      <select name={name} defaultValue={defaultValue} className={INPUT_CLASS}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A framed sub-section inside an editor panel. */
export function EditorSection({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel rounded-xl p-4 sm:p-5 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
        {icon && <span aria-hidden>{icon}</span>}
        {title}
      </h3>
      {children}
    </section>
  );
}

export const HIDDEN = (name: string, value: string) => (
  <input type="hidden" name={name} value={value} />
);
