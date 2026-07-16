import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatNumber } from "@/lib/game/format";
import { Converter } from "./Converter";

export const metadata = { title: "יהלומים | WARZONE" };

const TABS = [
  { label: "קסמים", active: false },
  { label: "רכישת יהלומים", active: true },
  { label: "היסטוריה", active: false },
];

type Bonus = {
  icon: string;
  label: string;
  price: string;
  active?: string;
};

const BONUSES: Bonus[] = [
  { icon: "🪨", label: "תוספת אבן", price: "45" },
  { icon: "⛓️", label: "תוספת ברזל", price: "45", active: "03:13:34" },
  { icon: "🪵", label: "תוספת עץ", price: "45" },
  { icon: "🪙", label: "תוספת זהב", price: "45" },
];

export default async function DiamondsPage() {
  const empire = await requireEmpire();
  const diamonds = Math.floor(empire.diamonds);

  return (
    <div className="space-y-6">
      <SectionHeading title="יהלומים" subtitle="DIAMONDS" ornament="💎" />

      {/* -------- balance -------- */}
      <div className="panel-gold flex items-center justify-between rounded-xl p-4">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
          <span aria-hidden>💎</span>
          חנות יהלומים
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">היתרה שלך:</span>
          <span className="nums text-2xl font-black text-sky-300" dir="ltr">
            {formatNumber(diamonds)}
          </span>
          <span className="rounded-full border border-sky-400/40 bg-panel-inset px-2 py-0.5 text-sm">
            💎
          </span>
        </div>
      </div>

      {/* -------- VIP badge -------- */}
      <div className="panel-inset mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-amber-400/30 py-2.5 text-center">
        <span className="text-sm font-bold text-amber-300">👑 VIP פעיל</span>
        <span className="text-xs text-zinc-400">
          פג בתאריך:{" "}
          <span className="nums" dir="ltr">
            23:00 15/07/2026
          </span>
        </span>
      </div>

      {/* -------- tabs -------- */}
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`${tab.active ? "btn btn-dark" : "btn btn-ghost"} px-4 py-2 text-sm`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -------- converter -------- */}
      <Converter />

      {/* -------- bonuses grid -------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BONUSES.map((b) => (
          <div key={b.label} className="panel relative rounded-xl p-4">
            {b.active && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="nums text-[11px] font-bold text-emerald-400" dir="ltr">
                  {b.active}
                </span>
              </div>
            )}
            <div className="text-3xl" aria-hidden>
              {b.icon}
            </div>
            <p className="mt-2 text-sm font-bold text-zinc-100">{b.label}</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              <span className="nums" dir="ltr">
                +10%
              </span>{" "}
              · 24ש׳ · מצטבר
            </p>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" className="btn btn-gold px-4 py-2 text-sm">
                רכוש
              </button>
              <span className="nums text-sm font-bold text-sky-300" dir="ltr">
                {b.price} 💎
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
