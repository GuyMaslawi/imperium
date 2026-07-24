import type { ReactNode } from "react";
import { type ResourceKey } from "@/lib/game/constants";
import { formatNumber } from "@/lib/game/format";
import { Tip } from "@/components/ui/Tip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";

/**
 * Top command bar: the six spendable balances shown as pills, plus the brand
 * emblem and language toggle — matching the reference header row.
 * (Citizens live on the management screen, not here.)
 */

type PillConfig = {
  key: ResourceKey;
  label: string;
  icon: IconName;
  /** What this balance is and where it comes from — shown on hover. */
  tip: string;
  /** tailwind text color for the number */
  numClass: string;
  /** tailwind border color accent */
  borderClass: string;
};

const PILLS: PillConfig[] = [
  {
    key: "turns", label: "תורות", icon: "turns",
    tip: "מטבע הפעולות: תקיפה עולה 10 תורות, ריגול 5. מתקבלות בכל עדכון דירוג לפי שדרוג \"קבלת תורות\".",
    numClass: "text-emerald-400", borderClass: "border-emerald-500/40",
  },
  {
    key: "gold", label: "זהב", icon: "gold",
    tip: "המשאב המרכזי לשדרוגים, נשקים ובנק. מיוצר במכרה הזהב על ידי עבדי מכרות.",
    numClass: "text-crimson-bright", borderClass: "border-crimson/50",
  },
  {
    key: "wood", label: "עץ", icon: "wood",
    tip: "חומר גלם לשדרוגי מבנים ונשקים. מיוצר במכרה העץ על ידי עבדי מכרות.",
    numClass: "text-bone", borderClass: "border-border-subtle",
  },
  {
    key: "iron", label: "ברזל", icon: "iron",
    tip: "הבסיס לכלי הנשק של האימפריה. מיוצר במכרה הברזל על ידי עבדי מכרות.",
    numClass: "text-zinc-200", borderClass: "border-border-subtle",
  },
  {
    key: "stone", label: "אבן", icon: "stone",
    tip: "אבן לחומות, מבנים וביצורים. מיוצרת במחצבת האבן על ידי עבדי מכרות.",
    numClass: "text-zinc-200", borderClass: "border-border-subtle",
  },
  {
    key: "diamonds", label: "יהלומים", icon: "diamond",
    tip: "מטבע פרימיום נדיר. מתקבל בכל עדכון יומי לפי רמת שדרוג \"מכרה יהלומים\".",
    numClass: "text-sky-300", borderClass: "border-sky-500/40",
  },
];

export function ResourceBar({
  resources,
  miniGame,
  mobileMenu,
}: {
  resources: Record<ResourceKey, number>;
  /** Optional slot rendered on the right of the command bar (mini-game die). */
  miniGame?: ReactNode;
  /** Mobile-only nav trigger, rendered at the start of the bar (hidden at lg+). */
  mobileMenu?: ReactNode;
}) {
  return (
    <header
      dir="ltr"
      className="sticky top-0 z-40 border-b bg-[#0b0a0e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b0a0e]/80"
      style={{ borderColor: "rgba(196,160,50,0.22)" }}
    >
      <div className="mx-auto flex max-w-[1900px] items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3 md:px-5">
        {mobileMenu}
        {/* balances */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {PILLS.map((p) => (
            <Tip key={p.key} tip={p.tip} side="bottom">
              <div className={`res-pill ${p.borderClass}`}>
                <Icon name={p.icon} size={20} className={`shrink-0 ${p.numClass}`} />
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

        {/* mini-game die (right side of the command bar) */}
        {miniGame}

        {/* language toggle */}
        <div className="hidden shrink-0 items-center overflow-hidden rounded-md border border-border-subtle text-xs font-bold sm:flex">
          <span className="bg-transparent px-2.5 py-1 text-zinc-400">EN</span>
          <span className="bg-gold/15 px-2.5 py-1 text-gold-bright">עב</span>
        </div>

        {/* brand emblem */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-sm font-black tracking-[0.2em] text-bone-bright sm:inline">
            IMP<span className="text-crimson-bright">E</span>RIUM
          </span>
          <LogoMark size={34} />
        </div>
      </div>
    </header>
  );
}
