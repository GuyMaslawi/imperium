"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clampChars } from "@/lib/game/text";
import { SUPPORT_BODY_MAX } from "@/lib/support";
import {
  getSupportInbox,
  getSupportThread,
  replyToSupport,
  setSupportStatus,
  type SupportInboxRow,
  type SupportLine,
  type SupportThreadView,
} from "@/server/actions/support";

/**
 * The staff side of the support chat: the queue on one side, the conversation on
 * the other.
 *
 * Hebrew-only and untranslated, like the rest of `/admin`.
 *
 * Two polls, at two speeds, for two different questions. The queue asks "has
 * anybody new written?" every fifteen seconds — it is a work list, and a new
 * ticket that shows up a quarter of a minute late costs nothing. The open
 * conversation asks every eight, because somebody is on the other end of it
 * right now watching for an answer; that is the whole reason this is a chat and
 * not a mailbox. Both stop while the tab is hidden.
 */

const POLL_INBOX_MS = 15_000;
const POLL_THREAD_MS = 8_000;

function mergeLines(current: SupportLine[], incoming: SupportLine[]) {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map((line) => line.id));
  const fresh = incoming.filter((line) => !seen.has(line.id));
  return fresh.length === 0 ? current : [...current, ...fresh];
}

export function SupportInbox({
  /** Ticket to open on arrival — how the Discord notification links straight
   *  at the conversation it is announcing. */
  initialThreadId = null,
}: {
  initialThreadId?: string | null;
}) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [rows, setRows] = useState<SupportInboxRow[]>([]);
  const [selected, setSelected] = useState<string | null>(initialThreadId);
  /**
   * The open ticket, its transcript, and — crucially — *which* ticket they
   * belong to, all in one value.
   *
   * Held together rather than in three states because switching tickets would
   * otherwise need a synchronous "clear the old one" pass in an effect, which is
   * both a cascading render and a frame of the previous player's conversation
   * under the new player's name. Tying the id to the content means a pane that
   * does not match the selection simply is not rendered.
   */
  const [pane, setPane] = useState<{
    id: string;
    view: SupportThreadView;
    lines: SupportLine[];
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  // The poll builds its cursor from what is already on screen, but must not be
  // re-created every time a line arrives — the ref carries the current pane into
  // a closure that only depends on which ticket is open.
  const paneRef = useRef<typeof pane>(null);
  useEffect(() => {
    paneRef.current = pane;
  }, [pane]);

  const thread = pane && pane.id === selected ? pane.view : null;
  const lines = pane && pane.id === selected ? pane.lines : [];

  /* ------------------------------------------------------------- the queue */

  const loadInbox = useCallback(async () => {
    const next = await getSupportInbox(filter);
    setRows(next);
  }, [filter]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "hidden") void loadInbox();
    };
    tick();
    const interval = setInterval(tick, POLL_INBOX_MS);
    return () => clearInterval(interval);
  }, [loadInbox]);

  /* --------------------------------------------------------- the open ticket */

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState === "hidden") return;
      // A poll asks only for what it does not already have; the first round
      // after opening a ticket has no cursor, so it loads the transcript.
      const held = paneRef.current?.id === selected ? paneRef.current : null;
      const since = held?.lines.at(-1)?.at;
      const view = await getSupportThread(selected, since);
      if (cancelled || !view) return;
      setPane({
        id: selected,
        view,
        lines: held && since ? mergeLines(held.lines, view.lines) : view.lines,
      });
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_THREAD_MS);
    const onWake = () => void poll();
    window.addEventListener("focus", onWake);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onWake);
    };
  }, [selected]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTop = el.scrollHeight;
    // Keyed on the pane rather than on the derived `lines` array, which is a
    // fresh reference on every render and would re-run this on all of them.
  }, [pane]);

  /* ----------------------------------------------------------------- actions */

  const send = async () => {
    const body = draft.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    setError(null);
    const result = await replyToSupport({ threadId: selected, body });
    setSending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDraft("");
    stickRef.current = true;
    setPane((prev) =>
      prev && prev.id === selected
        ? { ...prev, lines: mergeLines(prev.lines, [result.line]) }
        : prev
    );
    void loadInbox();
  };

  const toggleStatus = async () => {
    if (!thread) return;
    const next = thread.status === "OPEN" ? "CLOSED" : "OPEN";
    const result = await setSupportStatus({ threadId: thread.id, status: next });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPane((prev) =>
      prev && prev.id === thread.id
        ? { ...prev, view: { ...prev.view, status: next } }
        : prev
    );
    void loadInbox();
  };

  const openCount = rows.filter((row) => row.waiting).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      {/* ------------------------------- queue ------------------------------- */}
      <div className="panel rounded-xl p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex gap-1">
            {(["open", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition-colors ${
                  filter === value
                    ? "bg-gold/20 text-gold-bright"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {value === "open" ? "פתוחות" : "הכול"}
              </button>
            ))}
          </div>
          {openCount > 0 && (
            <span className="ms-auto rounded-full bg-red-600 px-2 py-px text-[10px] font-black text-white">
              {openCount} ממתינות
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-500">
            {filter === "open" ? "אין פניות פתוחות. שקט." : "עוד לא נפתחו פניות."}
          </p>
        ) : (
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row.id);
                    setError(null);
                    stickRef.current = true;
                  }}
                  className={`w-full rounded-lg border px-2.5 py-2 text-start transition-colors ${
                    selected === row.id
                      ? "border-gold/60 bg-gold/10"
                      : "border-border-subtle bg-panel-inset hover:border-gold/40 hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {/* The dot is the whole triage: it means "something arrived
                        since anybody last opened this". */}
                    {row.unseen && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    )}
                    <span className="truncate text-[13px] font-black text-gold-bright">
                      {row.who}
                    </span>
                    {row.status === "CLOSED" && (
                      <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] font-black text-zinc-400">
                        סגורה
                      </span>
                    )}
                    <span className="nums ms-auto shrink-0 text-[10px] text-zinc-500">
                      {row.time}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                    {row.waiting ? "" : "↩ "}
                    {row.preview}
                  </span>
                  {row.email && (
                    <span className="mt-0.5 block truncate text-[10px] text-zinc-600" dir="ltr">
                      {row.email}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------------------- conversation ---------------------------- */}
      <div className="panel flex min-h-[32rem] flex-col rounded-xl">
        {!thread ? (
          <p className="m-auto text-sm text-zinc-500">בחר פנייה מהרשימה</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle px-3 py-2">
              <span className="text-sm font-black text-gold-bright">{thread.who}</span>
              {thread.email && (
                <a
                  href={`mailto:${thread.email}`}
                  dir="ltr"
                  className="text-[11px] text-zinc-400 underline-offset-2 hover:text-gold"
                >
                  {thread.email}
                </a>
              )}
              {thread.userId && (
                <Link
                  href={`/admin/users/${thread.userId}`}
                  className="text-[11px] font-semibold text-gold-dim hover:text-gold-bright"
                >
                  כרטיס שחקן ←
                </Link>
              )}
              <button
                type="button"
                onClick={() => void toggleStatus()}
                className="btn btn-ghost ms-auto px-3 py-1 text-[11px]"
              >
                {thread.status === "OPEN" ? "סמן כטופלה" : "פתח מחדש"}
              </button>
            </div>

            {/* Everything the ticket knows about where it came from. A visitor
                writes "it doesn't work"; the screen they were on and the browser
                they were using is usually the other half of the sentence. */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-border-subtle bg-black/20 px-3 py-1.5 text-[10px] text-zinc-500">
              {thread.path && <span dir="ltr">מסך: {thread.path}</span>}
              {thread.ip && <span dir="ltr">IP: {thread.ip}</span>}
              {thread.userAgent && (
                <span dir="ltr" className="max-w-full truncate">
                  {thread.userAgent}
                </span>
              )}
            </div>

            <div
              ref={scrollRef}
              onScroll={() => {
                const el = scrollRef.current;
                if (!el) return;
                stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="chat-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3"
            >
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={`flex ${line.fromStaff ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`flex max-w-[80%] flex-col ${
                      line.fromStaff ? "items-start" : "items-end"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-black text-gold">
                        {line.fromStaff ? "צוות" : line.name}
                      </span>
                      <span className="nums text-[10px] text-zinc-600">{line.time}</span>
                    </div>
                    <div
                      className={`whitespace-pre-wrap break-words rounded-xl px-2.5 py-1.5 text-[13px] leading-relaxed ${
                        line.fromStaff
                          ? "rounded-tr-sm border border-gold/45 bg-gold-deep/40 text-bone-bright"
                          : "rounded-tl-sm border border-[#3a4152] bg-[#1b1f2b] text-bone"
                      }`}
                    >
                      {line.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle p-2">
              {error && (
                <p className="mb-1.5 rounded border border-red-500/40 bg-red-950/40 px-2 py-1 text-[11px] text-red-300">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(clampChars(e.target.value, SUPPORT_BODY_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={3}
                  placeholder="תשובה לשחקן…"
                  className="chat-scroll max-h-40 flex-1 resize-none rounded-lg border border-border-subtle bg-panel-inset px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-gold/60"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || draft.trim().length === 0}
                  className="btn btn-gold h-9 shrink-0 px-4 text-xs"
                >
                  {sending ? "…" : "שלח"}
                </button>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600">
                <Icon name="chat" size={11} />
                התשובה מופיעה אצל השחקן בצ׳אט התמיכה, גם אם אין לו חשבון פעיל.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
