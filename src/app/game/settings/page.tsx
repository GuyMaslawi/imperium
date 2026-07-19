import { requireEmpire } from "@/lib/auth";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CardTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/game/format";
import { logout } from "@/server/actions/auth";

export const metadata = { title: "הגדרות | אימפריום" };

export default async function SettingsPage() {
  const empire = await requireEmpire();

  return (
    <div className="space-y-6">
      <SectionHeading
        title="הגדרות"
        subtitle="SETTINGS"
        ornament={<Icon name="settings" size={22} className="text-crimson" />}
      />

      <div className="mx-auto max-w-xl space-y-4">
        <div className="panel rounded-xl p-4">
          <CardTitle icon="👑">שם האימפריה</CardTitle>
          <p className="panel-inset rounded-lg px-3 py-2 text-sm font-bold text-zinc-100">
            {empire.name}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            שם האימפריה נעול למשך העונה ולא ניתן לשינוי.
          </p>
        </div>

        <div className="panel rounded-xl p-4">
          <CardTitle icon="👤">פרטי חשבון</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between border-b border-border-subtle pb-2.5">
              <dt className="text-zinc-400">שם</dt>
              <dd className="font-medium text-zinc-100">{empire.user.name}</dd>
            </div>
            <div className="flex justify-between border-b border-border-subtle pb-2.5">
              <dt className="text-zinc-400">אימייל</dt>
              <dd dir="ltr" className="nums font-medium text-zinc-100">
                {empire.user.email}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-400">האימפריה נוסדה</dt>
              <dd className="nums font-medium text-zinc-100" dir="ltr">
                {formatDate(empire.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="panel-gold rounded-xl p-4">
          <CardTitle icon="🚪">התנתקות</CardTitle>
          <p className="mb-4 text-sm text-zinc-400">
            התנתקות מהחשבון במכשיר הזה. ההתקדמות שלך נשמרת.
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="btn btn-ghost px-4 py-2 text-sm text-red-400"
            >
              <Icon name="logout" size={16} className="inline-block align-text-bottom" /> התנתק מהמשחק
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
