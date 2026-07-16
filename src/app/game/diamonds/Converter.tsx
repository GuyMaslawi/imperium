"use client";

import { useState } from "react";

const STEP = 10;
const DAILY_LIMIT = 1000;

/** Diamond → turns converter with a local stepper (presentational). */
export function Converter() {
  const [amount, setAmount] = useState(100);

  const clamp = (n: number) => Math.max(0, Math.min(DAILY_LIMIT, n));
  const dec = () => setAmount((a) => clamp(a - STEP));
  const inc = () => setAmount((a) => clamp(a + STEP));

  const turns = amount; // 1:1 conversion

  return (
    <div className="panel rounded-xl p-4">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright">
        <span aria-hidden>💱</span>
        המרת יהלומים לתורות
      </h2>

      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
        <span className="nums rounded-md border border-gold/40 bg-panel-inset px-2 py-0.5 font-bold text-gold">
          1:1
        </span>
        <span>
          כל 10 יהלומים = 10 תורות מיידיות · מגבלה{" "}
          <span className="nums" dir="ltr">
            1,000
          </span>{" "}
          תורות ב-24 שעות
        </span>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={dec}
          aria-label="הפחת"
          className="btn btn-ghost h-10 w-10 text-lg leading-none"
        >
          −
        </button>
        <div className="nums w-28 rounded-lg border border-border-subtle bg-panel-inset py-2 text-center text-xl font-bold text-zinc-100" dir="ltr">
          {amount}
        </div>
        <button
          type="button"
          onClick={inc}
          aria-label="הוסף"
          className="btn btn-ghost h-10 w-10 text-lg leading-none"
        >
          +
        </button>
      </div>

      <p className="mt-3 text-center text-sm text-zinc-300">
        <span className="nums" dir="ltr">
          {amount}
        </span>{" "}
        יהלומים →{" "}
        <span className="nums font-bold text-emerald-400" dir="ltr">
          {turns}
        </span>{" "}
        תורות
      </p>

      <button type="button" className="btn btn-dark mt-4 w-full py-3">
        המר עכשיו
      </button>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>נוצל היום מתוך המגבלה</span>
        <span className="nums" dir="ltr">
          {DAILY_LIMIT.toLocaleString("en-US")} / 0
        </span>
      </div>
    </div>
  );
}
