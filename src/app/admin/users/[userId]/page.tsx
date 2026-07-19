import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { LabeledInput, LabeledSelect, EditorSection } from "@/components/admin/fields";
import {
  BUILDING_META,
  BUILDING_TYPES,
  EMPIRE_UPGRADE_META,
  EMPIRE_UPGRADE_TYPES,
  STORAGE_META,
  STORAGE_TYPES,
} from "@/lib/game/constants";
import { WEAPONS, WEAPON_CATEGORIES, WEAPON_CATEGORY_META, weaponByKey } from "@/lib/game/weapons";
import { SLOT_ORDER, SLOT_META } from "@/lib/game/hero";
import {
  updateUserAccount,
  toggleUserBan,
  resetUserPassword,
  deleteUser,
  updateEmpireCore,
  updateArmy,
  updateBank,
  updateBuilding,
  updateStorage,
  updateUpgrade,
  updateWeaponUnlock,
  setWeaponQuantity,
  updateHero,
  grantHeroItem,
  deleteHeroItem,
  removeFromGuild,
  sendMessageToEmpire,
  sendGift,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

const RARITY_OPTIONS = [
  { value: "COMMON", label: "רגיל" },
  { value: "RARE", label: "נדיר" },
  { value: "EPIC", label: "אפי" },
  { value: "LEGENDARY", label: "אגדי" },
];

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      empire: {
        include: {
          army: true,
          bankAccount: true,
          buildings: true,
          storages: true,
          upgrades: true,
          weapons: true,
          weaponUnlocks: true,
          hero: { include: { items: true } },
          guildMembership: { include: { guild: true } },
          season: true,
        },
      },
    },
  });
  if (!user) notFound();
  const empire = user.empire;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/users" className="btn btn-ghost px-3 py-1.5 text-xs">
          → כל השחקנים
        </Link>
        <div className="text-left text-[11px] text-zinc-500" dir="ltr">
          user: {user.id}
          {empire && <> · empire: {empire.id}</>}
        </div>
      </div>

      <SectionHeading
        title={empire?.name ?? user.name}
        subtitle={user.email}
        ornament={<Icon name="iron" size={22} className="text-crimson" />}
      />

      {/* ---------------- account ---------------- */}
      <EditorSection title="חשבון משתמש" icon="🔑">
        <div className="grid gap-4 lg:grid-cols-2">
          <ActionForm action={updateUserAccount} submitLabel="שמור פרטי חשבון">
            <input type="hidden" name="userId" value={user.id} />
            <LabeledInput label="שם" name="name" defaultValue={user.name} required />
            <LabeledInput label="אימייל" name="email" type="email" defaultValue={user.email} dir="ltr" required />
            <LabeledSelect
              label="תפקיד"
              name="role"
              defaultValue={user.role}
              options={[
                { value: "USER", label: "שחקן" },
                { value: "ADMIN", label: "אדמין" },
              ]}
            />
          </ActionForm>

          <div className="space-y-4">
            <ActionForm
              action={toggleUserBan}
              submitLabel={user.bannedAt ? "בטל חסימה" : "חסום משתמש"}
              submitVariant={user.bannedAt ? "secondary" : "danger"}
              confirm={user.bannedAt ? undefined : "לחסום את המשתמש? הוא לא יוכל להתחבר."}
            >
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-xs text-zinc-400">
                מצב נוכחי:{" "}
                {user.bannedAt ? (
                  <span className="font-bold text-red-300">חסום מאז {user.bannedAt.toLocaleString("he-IL")}</span>
                ) : (
                  <span className="font-bold text-emerald-300">פעיל</span>
                )}
              </p>
            </ActionForm>

            <ActionForm action={resetUserPassword} submitLabel="אפס סיסמה" submitVariant="secondary">
              <input type="hidden" name="userId" value={user.id} />
              <LabeledInput label="סיסמה חדשה" name="password" type="password" dir="ltr" placeholder="לפחות 6 תווים" />
            </ActionForm>

            <ActionForm
              action={deleteUser}
              submitLabel="מחק משתמש לצמיתות"
              submitVariant="danger"
              confirm="למחוק את המשתמש והאימפריה לצמיתות? פעולה בלתי הפיכה."
            >
              <input type="hidden" name="userId" value={user.id} />
              <LabeledInput label="הקלד DELETE לאישור" name="confirm" dir="ltr" placeholder="DELETE" />
            </ActionForm>
          </div>
        </div>
      </EditorSection>

      {!empire ? (
        <div className="panel-inset rounded-xl p-6 text-center text-zinc-400">
          למשתמש זה אין אימפריה.
        </div>
      ) : (
        <>
          {/* ---------------- core stats ---------------- */}
          <EditorSection title="נתוני אימפריה" icon="🏰">
            <ActionForm action={updateEmpireCore} submitLabel="שמור נתוני אימפריה">
              <input type="hidden" name="empireId" value={empire.id} />
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <LabeledInput label="שם אימפריה" name="name" defaultValue={empire.name} required />
                <LabeledInput label="רמה" name="level" type="number" min={1} defaultValue={empire.level} />
                <LabeledInput label="🪙 זהב" name="gold" type="number" min={0} defaultValue={Math.round(empire.gold)} />
                <LabeledInput label="🪵 עץ" name="wood" type="number" min={0} defaultValue={Math.round(empire.wood)} />
                <LabeledInput label="⚙️ ברזל" name="iron" type="number" min={0} defaultValue={Math.round(empire.iron)} />
                <LabeledInput label="🪨 אבן" name="stone" type="number" min={0} defaultValue={Math.round(empire.stone)} />
                <LabeledInput label="💎 יהלומים" name="diamonds" type="number" min={0} defaultValue={Math.round(empire.diamonds)} />
                <LabeledInput label="👥 אזרחים" name="citizens" type="number" min={0} defaultValue={empire.citizens} />
                <LabeledInput label="⏳ תורות" name="turns" type="number" min={0} defaultValue={empire.turns} />
                <LabeledInput label="🎡 סיבובי גלגל" name="wheelSpins" type="number" min={0} defaultValue={empire.wheelSpins} />
              </div>
            </ActionForm>
          </EditorSection>

          {/* ---------------- army + bank ---------------- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorSection title="צבא" icon="🪖">
              <ActionForm action={updateArmy} submitLabel="שמור צבא">
                <input type="hidden" name="empireId" value={empire.id} />
                <input type="hidden" name="userId" value={user.id} />
                <div className="grid grid-cols-3 gap-3">
                  <LabeledInput label="🪖 חיילים" name="soldiers" type="number" min={0} defaultValue={empire.army?.soldiers ?? 0} />
                  <LabeledInput label="🕵️ מרגלים" name="spies" type="number" min={0} defaultValue={empire.army?.spies ?? 0} />
                  <LabeledInput label="⛏️ עבדים" name="mineSlaves" type="number" min={0} defaultValue={empire.army?.mineSlaves ?? 0} />
                </div>
              </ActionForm>
            </EditorSection>

            <EditorSection title="בנק" icon="🏦">
              <ActionForm action={updateBank} submitLabel="שמור בנק">
                <input type="hidden" name="empireId" value={empire.id} />
                <input type="hidden" name="userId" value={user.id} />
                <LabeledInput
                  label="💰 יתרת זהב בבנק"
                  name="goldBalance"
                  type="number"
                  min={0}
                  defaultValue={Math.round(empire.bankAccount?.goldBalance ?? 0)}
                />
              </ActionForm>
            </EditorSection>
          </div>

          {/* ---------------- buildings ---------------- */}
          <EditorSection title="מבנים" icon="🏗️">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BUILDING_TYPES.map((type) => {
                const meta = BUILDING_META[type];
                const b = empire.buildings.find((x) => x.type === type);
                return (
                  <ActionForm
                    key={type}
                    action={updateBuilding}
                    submitLabel="שמור"
                    submitVariant="secondary"
                    submitClassName="w-full text-xs"
                    className="panel-inset rounded-lg p-3"
                  >
                    <input type="hidden" name="empireId" value={empire.id} />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="type" value={type} />
                    <p className="text-xs font-bold text-gold-bright">
                      {meta.icon} {meta.label}
                    </p>
                    <div className={`grid gap-2 ${meta.supportsSlaves ? "grid-cols-2" : "grid-cols-1"}`}>
                      <LabeledInput label="רמה" name="level" type="number" min={0} defaultValue={b?.level ?? 0} />
                      {meta.supportsSlaves && (
                        <LabeledInput label="עבדים" name="slavesAssigned" type="number" min={0} defaultValue={b?.slavesAssigned ?? 0} />
                      )}
                    </div>
                  </ActionForm>
                );
              })}
            </div>
          </EditorSection>

          {/* ---------------- storages + upgrades ---------------- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorSection title="מחסנים" icon="📦">
              <div className="grid gap-3 sm:grid-cols-2">
                {STORAGE_TYPES.map((type) => {
                  const meta = STORAGE_META[type];
                  const s = empire.storages.find((x) => x.resourceType === type);
                  return (
                    <ActionForm
                      key={type}
                      action={updateStorage}
                      submitLabel="שמור"
                      submitVariant="secondary"
                      submitClassName="w-full text-xs"
                      className="panel-inset rounded-lg p-3"
                    >
                      <input type="hidden" name="empireId" value={empire.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="resourceType" value={type} />
                      <p className="text-xs font-bold text-gold-bright">
                        {meta.icon} {meta.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <LabeledInput label="רמה" name="level" type="number" min={1} defaultValue={s?.level ?? 1} />
                        <LabeledInput label="מאוחסן" name="storedAmount" type="number" min={0} defaultValue={Math.round(s?.storedAmount ?? 0)} />
                      </div>
                    </ActionForm>
                  );
                })}
              </div>
            </EditorSection>

            <EditorSection title="שדרוגים" icon="📈">
              <div className="grid gap-3 sm:grid-cols-2">
                {EMPIRE_UPGRADE_TYPES.map((type) => {
                  const meta = EMPIRE_UPGRADE_META[type];
                  const u = empire.upgrades.find((x) => x.type === type);
                  return (
                    <ActionForm
                      key={type}
                      action={updateUpgrade}
                      submitLabel="שמור"
                      submitVariant="secondary"
                      submitClassName="w-full text-xs"
                      className="panel-inset rounded-lg p-3"
                    >
                      <input type="hidden" name="empireId" value={empire.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="type" value={type} />
                      <p className="text-xs font-bold text-gold-bright">
                        {meta.icon} {meta.label}
                      </p>
                      <LabeledInput label="רמה" name="level" type="number" min={1} defaultValue={u?.level ?? 1} />
                    </ActionForm>
                  );
                })}
              </div>
            </EditorSection>
          </div>

          {/* ---------------- weapon unlocks ---------------- */}
          <EditorSection title="פתיחת נשקים" icon="🔓">
            <div className="grid gap-3 sm:grid-cols-3">
              {WEAPON_CATEGORIES.map((category) => {
                const unlock = empire.weaponUnlocks.find((x) => x.category === category);
                return (
                  <ActionForm
                    key={category}
                    action={updateWeaponUnlock}
                    submitLabel="שמור"
                    submitVariant="secondary"
                    submitClassName="w-full text-xs"
                    className="panel-inset rounded-lg p-3"
                  >
                    <input type="hidden" name="empireId" value={empire.id} />
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="category" value={category} />
                    <p className="text-xs font-bold text-gold-bright">
                      {WEAPON_CATEGORY_META[category].icon} {WEAPON_CATEGORY_META[category].label}
                    </p>
                    <LabeledInput label="טיר פתוח" name="unlockedTier" type="number" min={1} defaultValue={unlock?.unlockedTier ?? 2} />
                  </ActionForm>
                );
              })}
            </div>
          </EditorSection>

          {/* ---------------- arsenal ---------------- */}
          <EditorSection title="מלאי נשקים" icon="🗡️">
            {empire.weapons.length > 0 && (
              <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {empire.weapons.map((w) => {
                  const def = weaponByKey(w.weaponKey);
                  return (
                    <ActionForm
                      key={w.id}
                      action={setWeaponQuantity}
                      submitLabel="עדכן"
                      submitVariant="secondary"
                      submitClassName="w-full text-xs"
                      className="panel-inset rounded-lg p-3"
                    >
                      <input type="hidden" name="empireId" value={empire.id} />
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="weaponKey" value={w.weaponKey} />
                      <p className="text-xs font-bold text-gold-bright">
                        {def ? `${def.name} (טיר ${def.tier})` : w.weaponKey}
                      </p>
                      <LabeledInput label="כמות (0 = מחיקה)" name="quantity" type="number" min={0} defaultValue={w.quantity} />
                    </ActionForm>
                  );
                })}
              </div>
            )}
            <ActionForm action={setWeaponQuantity} submitLabel="הוסף / הגדר נשק" className="panel rounded-lg p-3">
              <input type="hidden" name="empireId" value={empire.id} />
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledSelect
                  label="נשק"
                  name="weaponKey"
                  options={WEAPONS.map((w) => ({
                    value: w.key,
                    label: `${WEAPON_CATEGORY_META[w.category].icon} ${w.name} (טיר ${w.tier})`,
                  }))}
                />
                <LabeledInput label="כמות" name="quantity" type="number" min={0} defaultValue={1} />
              </div>
            </ActionForm>
          </EditorSection>

          {/* ---------------- hero ---------------- */}
          <EditorSection title="גיבור" icon="🛡️">
            <ActionForm action={updateHero} submitLabel="שמור גיבור" className="mb-4">
              <input type="hidden" name="empireId" value={empire.id} />
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <LabeledInput label="רמה" name="level" type="number" min={1} defaultValue={empire.hero?.level ?? 1} />
                <LabeledInput label="XP" name="xp" type="number" min={0} defaultValue={empire.hero?.xp ?? 0} />
                <LabeledInput label="נק' פנויות" name="unspentPoints" type="number" min={0} defaultValue={empire.hero?.unspentPoints ?? 0} />
                <LabeledInput label="נק' התקפה" name="attackPoints" type="number" min={0} defaultValue={empire.hero?.attackPoints ?? 0} />
                <LabeledInput label="נק' הגנה" name="defensePoints" type="number" min={0} defaultValue={empire.hero?.defensePoints ?? 0} />
                <LabeledInput label="נק' משאבים" name="resourcePoints" type="number" min={0} defaultValue={empire.hero?.resourcePoints ?? 0} />
                <LabeledInput label="איפוסים" name="resets" type="number" min={0} defaultValue={empire.hero?.resets ?? 0} />
              </div>
            </ActionForm>

            {empire.hero && empire.hero.items.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {empire.hero.items.map((item) => (
                  <ActionForm
                    key={item.id}
                    action={deleteHeroItem}
                    submitLabel="🗑"
                    submitVariant="danger"
                    submitClassName="!px-2 !py-1 text-xs"
                    className="flex items-center gap-2 panel-inset rounded-lg p-2"
                  >
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="userId" value={user.id} />
                    <span className="text-[11px] text-zinc-300">
                      {item.slot} · {item.rarity} · רמה {item.level}
                      {item.equipped && " · חבוש"}
                    </span>
                  </ActionForm>
                ))}
              </div>
            )}

            <ActionForm action={grantHeroItem} submitLabel="הענק פריט גיבור" className="panel rounded-lg p-3">
              <input type="hidden" name="empireId" value={empire.id} />
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <LabeledSelect
                  label="מיקום"
                  name="slot"
                  options={SLOT_ORDER.map((s) => ({ value: s, label: SLOT_META[s].label }))}
                />
                <LabeledSelect label="נדירות" name="rarity" options={RARITY_OPTIONS} />
                <LabeledInput label="רמה" name="level" type="number" min={1} defaultValue={1} />
              </div>
            </ActionForm>
          </EditorSection>

          {/* ---------------- guild ---------------- */}
          <EditorSection title="ברית" icon="🤝">
            {empire.guildMembership ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  חבר בברית{" "}
                  <span className="font-bold text-gold-bright">
                    {empire.guildMembership.guild.name}
                  </span>{" "}
                  בתפקיד {empire.guildMembership.role}
                </p>
                <ActionForm
                  action={removeFromGuild}
                  submitLabel="הסר מהברית"
                  submitVariant="danger"
                  confirm="להסיר את האימפריה מהברית?"
                >
                  <input type="hidden" name="empireId" value={empire.id} />
                  <input type="hidden" name="userId" value={user.id} />
                </ActionForm>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">האימפריה אינה חברה בברית.</p>
            )}
          </EditorSection>

          {/* ---------------- message + gift to this player ---------------- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorSection title="שלח הודעה לשחקן" icon="✉️">
              <ActionForm action={sendMessageToEmpire} submitLabel="שלח הודעה">
                <input type="hidden" name="empireId" value={empire.id} />
                <input type="hidden" name="userId" value={user.id} />
                <LabeledInput label="כותרת" name="title" required />
                <LabeledInput label="קישור (אופציונלי)" name="href" dir="ltr" placeholder="/game/base" />
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-gold-dim">תוכן</span>
                  <textarea
                    name="body"
                    rows={3}
                    required
                    className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60"
                  />
                </label>
              </ActionForm>
            </EditorSection>

            <EditorSection title="שלח מתנה לשחקן" icon="🎁">
              <ActionForm action={sendGift} submitLabel="שלח מתנה" submitVariant="secondary">
                <input type="hidden" name="scope" value="empire" />
                <input type="hidden" name="scopeId" value={empire.id} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <LabeledInput label="🪙 זהב" name="gold" type="number" min={0} placeholder="0" />
                  <LabeledInput label="🪵 עץ" name="wood" type="number" min={0} placeholder="0" />
                  <LabeledInput label="⚙️ ברזל" name="iron" type="number" min={0} placeholder="0" />
                  <LabeledInput label="🪨 אבן" name="stone" type="number" min={0} placeholder="0" />
                  <LabeledInput label="💎 יהלומים" name="diamonds" type="number" min={0} placeholder="0" />
                  <LabeledInput label="👥 אזרחים" name="citizens" type="number" min={0} placeholder="0" />
                  <LabeledInput label="⏳ תורות" name="turns" type="number" min={0} placeholder="0" />
                  <LabeledInput label="🎡 סיבובים" name="wheelSpins" type="number" min={0} placeholder="0" />
                </div>
                <LabeledInput label="כותרת הודעה מצורפת (אופציונלי)" name="title" placeholder="🎁 מתנה מההנהלה" />
                <LabeledInput label="תוכן ההודעה" name="body" placeholder="קבל את המתנה שלך!" />
              </ActionForm>
            </EditorSection>
          </div>
        </>
      )}
    </div>
  );
}
