/**
 * IMPERIUM brandmark — "Obsidian & Crimson".
 * A dark imperial crest: an obsidian shield edged in crimson, a bone crown
 * notch, and a crimson blade-pillar monogram at its heart. Self-contained SVG,
 * no external assets — scales cleanly anywhere.
 */

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = "lm";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1720" />
          <stop offset="1" stopColor="#0b0a0e" />
        </linearGradient>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4c35a" />
          <stop offset="1" stopColor="#a9861f" />
        </linearGradient>
      </defs>

      {/* crest / shield body */}
      <path
        d="M24 3l17 5v13c0 11-7.5 18-17 23C14.5 39 7 32 7 21V8z"
        fill={`url(#${id}-body)`}
        stroke="var(--crimson)"
        strokeWidth="1.6"
      />
      {/* inner bone hairline */}
      <path
        d="M24 6.4l14 4.1v10.6c0 9.3-6.2 15.4-14 19.7-7.8-4.3-14-10.4-14-19.7V10.5z"
        fill="none"
        stroke="var(--bone)"
        strokeWidth="0.9"
        opacity="0.35"
      />
      {/* crown notch */}
      <path d="M16 9l4 3 4-4 4 4 4-3-1.4 5H17.4z" fill="var(--bone)" opacity="0.85" />
      {/* crimson blade-pillar monogram (the "I" of Imperium) */}
      <path d="M24 15l3 3-3 14-3-14z" fill={`url(#${id}-blade)`} />
      <rect x="18.5" y="14.2" width="11" height="2.4" rx="1" fill="var(--bone)" />
      <circle cx="24" cy="34" r="1.6" fill="#e4c35a" />
    </svg>
  );
}

export function Logo({
  size = 40,
  subtitle = true,
  className,
}: {
  size?: number;
  /** Show the Hebrew subtitle line under the wordmark. */
  subtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`} dir="ltr">
      <LogoMark size={size} />
      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-[0.22em] text-bone-bright"
          style={{ fontSize: size * 0.5 }}
        >
          IMP<span className="text-crimson-bright">E</span>RIUM
        </span>
        {subtitle && (
          <span
            className="mt-1 tracking-[0.42em] text-bone-dim"
            style={{ fontSize: size * 0.2 }}
          >
            אימפריום
          </span>
        )}
      </div>
    </div>
  );
}
