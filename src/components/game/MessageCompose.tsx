"use client";

import { useActionState, useMemo, useState } from "react";
import { sendPlayerMessage } from "@/server/actions/messages";
import {
  MESSAGE_BODY_MAX,
  MESSAGE_MAX_RECIPIENTS,
  MESSAGE_TITLE_MAX,
} from "@/lib/game/messages";
import type { ActionState } from "@/server/actions/game";
import { Dialog } from "@/components/ui/Dialog";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Icon } from "@/components/ui/Icon";

export type PlayerOption = { id: string; name: string };

/**
 * "Send a message" box: pick one or more players out of the game's roster (a
 * closed list — you can only write to empires that exist, never to a free-text
 * name), then write a subject and a body.
 */
export function MessageCompose({ players }: { players: PlayerOption[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [state, action] = useActionState<ActionState, FormData>(
    sendPlayerMessage,
    {}
  );

  // A delivered message empties the composer so the next one starts blank.
  // Done as a render-phase adjustment (React's "derive state from props"
  // pattern) rather than an effect — the action always returns a fresh state
  // object, so identity is what marks a new result.
  const [handledState, setHandledState] = useState<ActionState>(state);
  const [formKey, setFormKey] = useState(0);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) {
      setSelected([]);
      setQuery("");
      setFormKey((k) => k + 1);
    }
  }

  const byId = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? players.filter((p) => p.name.toLowerCase().includes(q))
      : players;
    // The roster can be long — the search box is how you reach the rest.
    return list.slice(0, 60);
  }, [players, query]);

  const atCap = selected.length >= MESSAGE_MAX_RECIPIENTS;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MESSAGE_MAX_RECIPIENTS
          ? prev
          : [...prev, id]
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-gold px-4 py-2 text-sm"
      >
        <Icon name="messages" size={16} /> שלח הודעה
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="compose-title"
        size="lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="compose-title" className="text-lg font-black text-gold-bright">
            הודעה חדשה
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="סגירה"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-zinc-400 transition-colors hover:border-crimson/50 hover:text-crimson-bright"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form key={formKey} action={action} className="mt-4 space-y-3">
          {/* recipients — closed list of the game's players */}
          <div>
            <label
              htmlFor="msg-search"
              className="mb-1.5 block text-xs font-semibold text-gold"
            >
              נמענים ({selected.length}/{MESSAGE_MAX_RECIPIENTS})
            </label>

            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.map((id) => (
                  <span
                    key={id}
                    className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs font-bold text-gold-bright"
                  >
                    {byId.get(id) ?? "—"}
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      aria-label={`הסרת ${byId.get(id) ?? ""}`}
                      className="text-gold-dim hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* The picked ids ride along with the form submission. */}
            {selected.map((id) => (
              <input key={id} type="hidden" name="recipients" value={id} />
            ))}

            <input
              id="msg-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש שחקן לפי שם אימפריה"
              className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
            />

            <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border-subtle bg-panel-inset p-1">
              {matches.length === 0 ? (
                <li className="px-2 py-3 text-center text-xs text-zinc-500">
                  לא נמצא שחקן בשם הזה.
                </li>
              ) : (
                matches.map((p) => {
                  const checked = selected.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          checked
                            ? "bg-gold/12 text-gold-bright"
                            : "text-zinc-300 hover:bg-white/5"
                        } ${!checked && atCap ? "opacity-40" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && atCap}
                          onChange={() => toggle(p.id)}
                          className="accent-[var(--gold)]"
                        />
                        <span className="truncate font-semibold">{p.name}</span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
            {atCap && (
              <p className="mt-1 text-[11px] text-zinc-500">
                הגעת למקסימום {MESSAGE_MAX_RECIPIENTS} נמענים בהודעה אחת.
              </p>
            )}
          </div>

          {/* subject */}
          <div>
            <label
              htmlFor="msg-title"
              className="mb-1.5 block text-xs font-semibold text-gold"
            >
              נושא
            </label>
            <input
              id="msg-title"
              name="title"
              type="text"
              required
              maxLength={MESSAGE_TITLE_MAX}
              placeholder="על מה ההודעה?"
              className="w-full rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* body */}
          <div>
            <label
              htmlFor="msg-body"
              className="mb-1.5 block text-xs font-semibold text-gold"
            >
              תוכן ההודעה
            </label>
            <textarea
              id="msg-body"
              name="body"
              required
              rows={5}
              maxLength={MESSAGE_BODY_MAX}
              placeholder={`עד ${MESSAGE_BODY_MAX} תווים`}
              className="w-full resize-y rounded-lg border border-border-subtle bg-panel-inset px-3 py-2 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
            />
          </div>

          <FormMessage error={state.error} success={state.success} />

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-500">
              ההודעה תגיע לתיבת הדואר של הנמענים.
            </p>
            <SubmitButton
              className="btn btn-gold"
              disabled={selected.length === 0}
              pendingText="שולח..."
            >
              שליחה
            </SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
