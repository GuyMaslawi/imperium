import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = { title: "הישגים | WARZONE" };

type Achievement = {
  name: string;
  reward: string;
  rewardIcon: string;
  collected: boolean;
};

const ACHIEVEMENTS: Achievement[] = [
  { name: "תקיפה ראשונה", reward: "35+", rewardIcon: "👥", collected: true },
  { name: "ריגול ראשון", reward: "35+", rewardIcon: "👥", collected: true },
  { name: "למצוא חפץ ראשון", reward: "250+", rewardIcon: "💎", collected: true },
  { name: "לקנות נשק התקפה", reward: "25+", rewardIcon: "⚔️", collected: true },
  { name: "לקנות נשק הגנה", reward: "25+", rewardIcon: "🛡️", collected: true },
  { name: "לקנות נשק ריגול", reward: "25+", rewardIcon: "🕵️", collected: true },
  { name: "לשדרג קבלת מגויסים", reward: "45+", rewardIcon: "👥", collected: true },
  { name: "לעלות עיר", reward: "1,000+", rewardIcon: "🏰", collected: true },
  { name: "מיליונר ראשון", reward: "500+", rewardIcon: "🪙", collected: true },
  { name: "לבנות מכרה", reward: "30+", rewardIcon: "⛏️", collected: true },
  { name: "צבא של 1000", reward: "60+", rewardIcon: "👥", collected: true },
  { name: "10 ניצחונות", reward: "120+", rewardIcon: "🏆", collected: true },
  { name: "הפקדה ראשונה בבנק", reward: "20+", rewardIcon: "🏦", collected: true },
  {
    name: "לכבוש מקום ראשון בדירוג",
    reward: "5,000+",
    rewardIcon: "👑",
    collected: false,
  },
];

export default async function AchievementsPage() {
  await requireEmpire();

  const collected = ACHIEVEMENTS.filter((a) => a.collected).length;
  const total = ACHIEVEMENTS.length + 5; // presentational total

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2">
        <SectionHeading title="הישגים" subtitle="ACHIEVEMENTS" ornament="🏆" />
        <span
          className="nums rounded-full border border-gold/40 bg-panel-inset px-3 py-0.5 text-sm font-bold text-gold"
          dir="ltr"
        >
          {collected}/{total}
        </span>
      </div>

      <div className="mx-auto max-w-2xl space-y-2.5">
        {ACHIEVEMENTS.map((a) => (
          <div
            key={a.name}
            className="panel flex items-center justify-between gap-3 rounded-xl p-3.5"
          >
            {/* right: medallion + name */}
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-panel-inset text-xl">
                🏅
              </span>
              <span className="font-bold text-zinc-100">{a.name}</span>
            </div>

            {/* left: reward + collected state */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="nums flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-sm font-bold text-emerald-300">
                <span dir="ltr">{a.reward}</span>
                <span aria-hidden>{a.rewardIcon}</span>
              </span>
              {a.collected ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <span aria-hidden>✓</span> נאסף
                </span>
              ) : (
                <span className="text-xs font-semibold text-gold-dim">
                  לא נאסף
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
