"use client";

import { useEffect, useRef, useState } from "react";
import { WHEEL_PRIZES, wheelPrizeAmount, type WheelPrizeDef } from "@/lib/game/wheel";
import { formatNumber } from "@/lib/game/format";

const SEG = 360 / WHEEL_PRIZES.length;
const SPIN_MS = 4200;

/** Wedge i is centered at i*SEG (the gradient starts half a wedge early). */
function conic(): string {
  const stops = WHEEL_PRIZES.map((p, i) => `${p.color} ${i * SEG}deg ${(i + 1) * SEG}deg`);
  return `conic-gradient(from -${SEG / 2}deg, ${stops.join(", ")})`;
}

/** "2,400 זהב" for amount prizes, just the label for unit prizes. */
function prizeText(prize: WheelPrizeDef, day: number): string {
  return prize.kind === "amount"
    ? `${formatNumber(wheelPrizeAmount(prize, day))} ${prize.label}`
    : prize.label;
}

type ConfettiPiece = { id: number; dx: string; dy: string; rot: string; delay: string; icon: string };

const CONFETTI_ICONS = ["✨", "⭐", "🪙", "💎", "🎉"];

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 120 + Math.random() * 110;
    return {
      id: i,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 40}px`,
      rot: `${Math.random() * 540 - 270}deg`,
      delay: `${Math.random() * 0.15}s`,
      icon: CONFETTI_ICONS[i % CONFETTI_ICONS.length],
    };
  });
}

export function WheelOfFortune({
  spinsAvailable,
  seasonDay,
  onClose,
}: {
  spinsAvailable: number;
  /** Current day of the season — prize amounts grow with it. */
  seasonDay: number;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelPrizeDef | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(spinsAvailable);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function spin() {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true);
    setResult(null);
    setConfetti([]);

    const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
    // Land the winning wedge under the pointer, with a little jitter inside
    // the wedge so it doesn't stop dead-center every time.
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const restAngle = 360 - idx * SEG + jitter;
    const next = rotation - (rotation % 360) + 360 * 6 + restAngle;
    setRotation(next);
    setSpinsLeft((n) => n - 1);

    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setResult(WHEEL_PRIZES[idx]);
      setConfetti(makeConfetti());
    }, SPIN_MS);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="ornate-shell relative my-6 w-full max-w-lg rounded-xl p-6 text-center"
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-3xl font-black text-gold-bright">גלגל המזל</h2>
        <div className="mt-3 inline-block rounded-full border border-gold/40 bg-panel-inset px-4 py-1 text-sm">
          <span className="text-zinc-400">סיבובים זמינים: </span>
          <span className="nums font-black text-gold-bright" dir="ltr">{spinsLeft}</span>
        </div>
        <p className="mt-3 text-xs font-semibold text-gold">
          יום <span className="nums" dir="ltr">{seasonDay}</span> לעונה — הפרסים גדלים בכל יום של העונה!
        </p>
        <p className="mt-1 text-xs font-semibold text-zinc-400">
          פרס &quot;חפץ&quot; דורש לפחות מקום פנוי אחד בתיק הגיבור.
        </p>

        {/* wheel */}
        <div className="relative mx-auto mt-5 h-[340px] w-[340px]">
          {/* pointer */}
          <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
            <div
              className={`h-0 w-0 border-x-[12px] border-t-[22px] border-x-transparent border-t-red-500 drop-shadow ${
                spinning ? "wheel-pointer-tick" : ""
              }`}
            />
          </div>
          {/* rim */}
          <div
            className={`absolute inset-0 rounded-full border-[10px] border-[#caa24a] shadow-[0_0_40px_-8px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.6)] ${
              spinning ? "wheel-glow" : ""
            }`}
          />
          {/* carnival bulbs on the rim (fixed layer — doesn't rotate) */}
          {WHEEL_PRIZES.map((_, i) => (
            <div
              key={`bulb-${i}`}
              className="absolute left-1/2 top-1/2 z-10"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * SEG}deg) translateY(-165px)`,
              }}
            >
              <div
                className={`wheel-bulb ${spinning ? "wheel-bulb-on" : ""}`}
                style={spinning ? { animationDelay: i % 2 === 0 ? "0s" : "0.2s" } : undefined}
              />
            </div>
          ))}
          {/* disc */}
          <div
            className="absolute inset-[10px] rounded-full"
            style={{
              background: conic(),
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12,0.8,0.15,1)` : "none",
            }}
          >
            {WHEEL_PRIZES.map((p, i) => {
              // Wedge i is centered at i*SEG — keep labels on that exact angle.
              const angle = i * SEG;
              return (
                <div
                  key={p.key}
                  className="absolute left-1/2 top-1/2 flex flex-col items-center gap-0.5 text-white"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-108px) rotate(${-angle}deg)`,
                  }}
                >
                  <span className="text-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{p.icon}</span>
                  <span className="whitespace-nowrap text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {p.label}
                  </span>
                  <span
                    className="nums whitespace-nowrap text-[9px] font-black text-gold-bright drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    dir="ltr"
                  >
                    {p.kind === "amount" ? formatNumber(wheelPrizeAmount(p, seasonDay)) : "x1"}
                  </span>
                </div>
              );
            })}
          </div>
          {/* winning wedge flash (top wedge, under the pointer) */}
          {result && (
            <div
              className="wheel-win-flash pointer-events-none absolute inset-[10px] rounded-full"
              style={{
                background: `conic-gradient(from -${SEG / 2}deg, rgba(255,255,255,0.5) 0deg ${SEG}deg, transparent ${SEG}deg 360deg)`,
              }}
            />
          )}
          {/* hub */}
          <div
            className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#caa24a] bg-gradient-to-b from-[#e8c877] to-[#c99a3f] text-2xl shadow-lg ${
              result ? "wheel-pop" : ""
            }`}
          >
            ⭐
          </div>
          {/* confetti burst */}
          {confetti.map((c) => (
            <span
              key={c.id}
              className="wheel-confetti pointer-events-none absolute left-1/2 top-1/2 z-30 text-lg"
              style={{
                "--dx": c.dx,
                "--dy": c.dy,
                "--rot": c.rot,
                animationDelay: c.delay,
              } as React.CSSProperties}
            >
              {c.icon}
            </span>
          ))}
        </div>

        {/* result */}
        {result && (
          <div className="wheel-pop mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
            <p className="text-sm font-bold text-emerald-300">
              זכית ב־{result.icon} {prizeText(result, seasonDay)}!
            </p>
            {result.note && (
              <p className="mt-0.5 text-[11px] text-emerald-200/70">{result.note}</p>
            )}
          </div>
        )}

        {/* actions */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            disabled={spinning || spinsLeft < 10}
            className="btn flex-col rounded-lg border border-sky-500/50 bg-gradient-to-b from-sky-700/70 to-sky-900/70 px-5 py-3 font-black text-sky-100 disabled:opacity-40"
            title="נפתח כשיש לפחות 10 סיבובים זמינים"
          >
            x10 סיבובים
          </button>
          <button
            onClick={spin}
            disabled={spinning || spinsLeft <= 0}
            className="btn btn-dark px-5 py-3 text-base disabled:opacity-40"
          >
            🎰 {spinning ? "מסתובב…" : "סובב"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-zinc-500 nums" dir="ltr">
          x10 נפתח כשיש לפחות 10 סיבובים זמינים.
        </p>
      </div>
    </div>
  );
}
