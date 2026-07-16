import { type ResourceKey } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { Tip } from "@/components/ui/Tip";

/**
 * Top command bar: the six spendable balances shown as pills, plus the brand
 * emblem and language toggle — matching the reference header row.
 * (Citizens live on the management screen, not here.)
 */

type PillConfig = {
  key: ResourceKey;
  label: string;
  icon: string;
  /** What this balance is and where it comes from — shown on hover. */
  tip: string;
  /** tailwind text color for the number */
  numClass: string;
  /** tailwind border color accent */
  borderClass: string;
};

const PILLS: PillConfig[] = [
  {
    key: "turns", label: "תורות", icon: "🎖️",
    tip: "מטבע הפעולות: תקיפה עולה 10 תורות, ריגול 5. מתקבלות בכל עדכון דירוג לפי שדרוג \"קבלת תורות\".",
    numClass: "text-emerald-400", borderClass: "border-emerald-500/40",
  },
  {
    key: "gold", label: "זהב", icon: "🪙",
    tip: "המשאב המרכזי לשדרוגים, נשקים ובנק. מיוצר במכרה הזהב על ידי עבדי מכרות.",
    numClass: "text-gold-bright", borderClass: "border-gold/50",
  },
  {
    key: "wood", label: "עץ", icon: "🪵",
    tip: "חומר גלם לשדרוגי מבנים ונשקים. מיוצר במכרה העץ על ידי עבדי מכרות.",
    numClass: "text-amber-200/90", borderClass: "border-border-subtle",
  },
  {
    key: "iron", label: "ברזל", icon: "⚙️",
    tip: "הבסיס לכלי הנשק של האימפריה. מיוצר במכרה הברזל על ידי עבדי מכרות.",
    numClass: "text-zinc-200", borderClass: "border-border-subtle",
  },
  {
    key: "stone", label: "אבן", icon: "🪨",
    tip: "אבן לחומות, מבנים וביצורים. מיוצרת במחצבת האבן על ידי עבדי מכרות.",
    numClass: "text-zinc-200", borderClass: "border-border-subtle",
  },
  {
    key: "diamonds", label: "יהלומים", icon: "💎",
    tip: "מטבע פרימיום נדיר. מתקבל בכל עדכון יומי לפי רמת שדרוג \"מכרה יהלומים\".",
    numClass: "text-sky-300", borderClass: "border-sky-500/40",
  },
];

export function ResourceBar({
  resources,
}: {
  resources: Record<ResourceKey, number>;
}) {
  return (
    <header
      dir="ltr"
      className="sticky top-0 z-30 border-b border-border-gold/50 bg-[#0b0806]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b0806]/80"
      style={{ borderColor: "rgba(212,168,67,0.22)" }}
    >
      <div className="mx-auto flex max-w-[1900px] items-center gap-3 px-3 py-2 md:px-5">
        {/* balances */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {PILLS.map((p) => (
            <Tip key={p.key} tip={p.tip} side="bottom">
              <div className={`res-pill ${p.borderClass}`}>
                <span aria-hidden className="text-lg leading-none">{p.icon}</span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-medium text-zinc-400">{p.label}</span>
                  <span className={`nums text-sm font-extrabold ${p.numClass}`} dir="ltr">
                    {formatNumber(resources[p.key])}
                  </span>
                </div>
              </div>
            </Tip>
          ))}
        </div>

        {/* language toggle */}
        <div className="hidden shrink-0 items-center overflow-hidden rounded-md border border-border-subtle text-xs font-bold sm:flex">
          <span className="bg-transparent px-2.5 py-1 text-zinc-400">EN</span>
          <span className="bg-gold/15 px-2.5 py-1 text-gold-bright">עב</span>
        </div>

        {/* brand emblem */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex flex-col items-end leading-none">
            <span className="text-sm font-black tracking-widest text-zinc-100">WARZONE</span>
          </div>
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gold/50 bg-gradient-to-b from-[#2a2013] to-[#12100c] text-lg shadow-inner"
          >
            ⚔️
          </span>
        </div>
      </div>
    </header>
  );
}
