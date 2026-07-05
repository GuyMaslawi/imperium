import { requireEmpire } from "@/lib/auth";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/game/format";
import { logout } from "@/server/actions/auth";

export const metadata = { title: "הגדרות | אימפריום" };

export default async function SettingsPage() {
  const empire = await requireEmpire();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">הגדרות ⚙️</h1>
        <p className="mt-1 text-sm text-zinc-400">ניהול האימפריה והחשבון שלך.</p>
      </div>

      <Card>
        <CardTitle icon="👑">שם האימפריה</CardTitle>
        <p className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm font-bold text-zinc-100">
          {empire.name}
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          שם האימפריה נעול למשך העונה ולא ניתן לשינוי.
        </p>
      </Card>

      <Card>
        <CardTitle icon="👤">פרטי חשבון</CardTitle>
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-400">שם</dt>
            <dd className="font-medium text-zinc-100">{empire.user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">אימייל</dt>
            <dd dir="ltr" className="font-medium text-zinc-100">{empire.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-400">האימפריה נוסדה</dt>
            <dd className="font-medium text-zinc-100">{formatDate(empire.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle icon="🚪">התנתקות</CardTitle>
        <p className="mb-4 text-sm text-zinc-400">
          התנתקות מהחשבון במכשיר הזה. ההתקדמות שלך נשמרת.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer rounded-lg border border-red-900 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-950/50"
          >
            התנתק מהמשחק
          </button>
        </form>
      </Card>
    </div>
  );
}
