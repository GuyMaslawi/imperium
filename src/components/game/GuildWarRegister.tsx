"use client";

import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  GUILD_WAR_END_LABEL,
  GUILD_WAR_MIN_GUILDS,
  GUILD_WAR_START_LABEL,
} from "@/lib/game/guildWar";
import {
  registerGuildForWar,
  withdrawGuildFromWar,
} from "@/server/actions/guildWar";
import type { ActionState } from "@/server/actions/game";

export interface GuildWarRegisterProps {
  guildName: string;
  /** The guild is already enrolled in the next war. */
  registered: boolean;
  /** Leader or deputy — plain members may not commit the roster. */
  mayManage: boolean;
  /** Guilds enrolled for the next bell, this one included. */
  enrolled: number;
  /**
   * The next bell as Jerusalem wall time, formatted on the server. The client
   * must never format a date itself here: the server renders this component
   * once before hydration, and a locale/timezone difference would tear.
   */
  nextBellLabel: string;
}

/**
 * Enrolment for the next war. Registration is always open — there is no
 * deadline to miss, because signing up always books the *next* bell, whatever
 * the clock says when you press it.
 */
export function GuildWarRegister({
  guildName,
  registered,
  mayManage,
  enrolled,
  nextBellLabel,
}: GuildWarRegisterProps) {
  const [joinState, joinAction] = useActionState<ActionState, FormData>(
    registerGuildForWar,
    {}
  );
  const [leaveState, leaveAction] = useActionState<ActionState, FormData>(
    withdrawGuildFromWar,
    {}
  );

  const short = enrolled < GUILD_WAR_MIN_GUILDS;

  return (
    <div className={`rounded-xl p-4 ${registered ? "panel-gold" : "panel"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
            <Icon name="guild" size={18} className="text-crimson" />
            הרשמה למלחמה הבאה
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {nextBellLabel} · הזירה נפתחת ב־
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {GUILD_WAR_START_LABEL}
            </span>{" "}
            ונסגרת ב־
            <span className="nums font-bold text-gold-bright" dir="ltr">
              {GUILD_WAR_END_LABEL}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            ההרשמה פתוחה תמיד — כל לחיצה רושמת אתכם לקרב הקרוב שטרם התחיל. אחרי
            זה אין מה לעשות: הקרב מתנהל אוטומטית והמערכת מנהלת אותו לבד.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${
            registered
              ? "border-emerald-700 bg-emerald-950/50 text-emerald-300"
              : "border-zinc-700 bg-black/40 text-zinc-400"
          }`}
        >
          {registered ? `${guildName} רשומה ✓` : "לא רשומים"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="panel-inset rounded-full px-3 py-1 text-xs text-zinc-400">
          בריתות רשומות:{" "}
          <span
            className={`nums font-bold ${short ? "text-amber-300" : "text-gold-bright"}`}
            dir="ltr"
          >
            {enrolled}
          </span>
        </span>
        {short && (
          <span className="text-xs text-amber-300/90">
            צריך לפחות {GUILD_WAR_MIN_GUILDS} בריתות — אחרת הקרב מתבטל ואף אחד לא
            זוכה בכלום.
          </span>
        )}
      </div>

      {mayManage ? (
        <form className="mt-4 flex flex-wrap gap-2">
          {registered ? (
            <SubmitButton
              formAction={leaveAction}
              variant="secondary"
              className="btn btn-dark"
              pendingText="מבטל..."
            >
              ביטול ההרשמה
            </SubmitButton>
          ) : (
            <SubmitButton
              formAction={joinAction}
              className="btn btn-gold"
              pendingText="נרשמים..."
            >
              <Icon name="attack" size={16} /> רשום את {guildName} למלחמה
            </SubmitButton>
          )}
        </form>
      ) : (
        <p className="mt-4 rounded-lg border border-border-subtle bg-black/30 px-3 py-2 text-xs text-zinc-400">
          רק מנהיג או סגן יכולים לרשום את הברית — ההרשמה מכניסה את כל הרוסטר
          לזירה למשך חצי שעה, וזו לא החלטה של חבר בודד.
        </p>
      )}

      <FormMessage
        error={joinState.error ?? leaveState.error}
        success={joinState.success ?? leaveState.success}
      />
    </div>
  );
}
