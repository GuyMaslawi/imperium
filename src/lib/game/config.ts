import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Admin-editable global game balance. These are the *server-authoritative*
 * tunables — values the game logic reads when it actually grants resources,
 * resolves battles, or seeds a new empire. Editing them from the admin panel
 * changes the live game for everyone.
 *
 * Persisted as a JSON overlay in the GameConfig singleton row and merged over
 * these defaults by `getTunables()`. The defaults mirror the historical
 * hard-coded constants so an empty overlay leaves the game unchanged.
 */
export interface GameTunables {
  /** New-empire starting bundle (see newEmpireData). */
  starting: {
    gold: number;
    wood: number;
    iron: number;
    stone: number;
    diamonds: number;
    citizens: number;
    turns: number;
    soldiers: number;
    spies: number;
    mineSlaves: number;
    slavesPerMine: number;
    wheelSpins: number;
  };
  /** Daily-update economy (citizens, diamonds, wheel spins). */
  daily: {
    citizensBase: number;
    citizensPerLevel: number;
    wheelSpins: number;
  };
  /** Battle & spy resolution parameters. */
  battle: {
    defenseBonus: number;
    plunderRate: number;
    enslaveRate: number;
    enslaveMinSoldiers: number;
    attackTurnCost: number;
    spyTurnCost: number;
  };
  /** Global economy scalars applied on top of per-empire bonuses. */
  economy: {
    mineProductionMultiplier: number;
  };
  /** Diamond store (real-money purchase page) tunables. */
  diamondStore: {
    /** Percent off every diamond package price (0 = full price). */
    purchaseDiscountPct: number;
  };
}

export const DEFAULT_TUNABLES: GameTunables = {
  starting: {
    gold: 3000,
    wood: 2000,
    iron: 1500,
    stone: 1500,
    diamonds: 10,
    citizens: 60,
    turns: 50,
    soldiers: 10,
    spies: 2,
    mineSlaves: 20,
    slavesPerMine: 5,
    wheelSpins: 4,
  },
  daily: {
    citizensBase: 20,
    citizensPerLevel: 5,
    wheelSpins: 3,
  },
  battle: {
    defenseBonus: 1.2,
    plunderRate: 0.1,
    enslaveRate: 0.1,
    enslaveMinSoldiers: 20,
    attackTurnCost: 10,
    spyTurnCost: 5,
  },
  economy: {
    mineProductionMultiplier: 1,
  },
  diamondStore: {
    purchaseDiscountPct: 0,
  },
};

/** Human-readable metadata for the balance editor, grouped like GameTunables. */
export const TUNABLE_META: Record<
  keyof GameTunables,
  { label: string; icon: string; fields: Record<string, { label: string; step?: number }> }
> = {
  starting: {
    label: "אימפריה חדשה — חבילת פתיחה",
    icon: "🌱",
    fields: {
      gold: { label: "זהב התחלתי" },
      wood: { label: "עץ התחלתי" },
      iron: { label: "ברזל התחלתי" },
      stone: { label: "אבן התחלתית" },
      diamonds: { label: "יהלומים התחלתיים" },
      citizens: { label: "אזרחים התחלתיים" },
      turns: { label: "תורות התחלתיות" },
      soldiers: { label: "חיילים התחלתיים" },
      spies: { label: "מרגלים התחלתיים" },
      mineSlaves: { label: "עבדי מכרות התחלתיים" },
      slavesPerMine: { label: "עבדים משובצים לכל מכרה" },
      wheelSpins: { label: "סיבובי גלגל התחלתיים" },
    },
  },
  daily: {
    label: "עדכון יומי — כלכלה",
    icon: "🌅",
    fields: {
      citizensBase: { label: "אזרחים בסיס לעדכון יומי" },
      citizensPerLevel: { label: "אזרחים נוספים לכל רמת שדרוג" },
      wheelSpins: { label: "סיבובי גלגל לעדכון יומי" },
    },
  },
  battle: {
    label: "קרב וריגול",
    icon: "⚔️",
    fields: {
      defenseBonus: { label: "בונוס מגן (1.2 = +20%)", step: 0.05 },
      plunderRate: { label: "אחוז ביזה מהמגן (0.1 = 10%)", step: 0.01 },
      enslaveRate: { label: "אחוז שעבוד חיילים (0.1 = 10%)", step: 0.01 },
      enslaveMinSoldiers: { label: "מינימום חיילים לשעבוד" },
      attackTurnCost: { label: "עלות תורות לתקיפה" },
      spyTurnCost: { label: "עלות תורות לריגול" },
    },
  },
  economy: {
    label: "כלכלה גלובלית",
    icon: "🏭",
    fields: {
      mineProductionMultiplier: { label: "מכפיל תפוקת מכרות גלובלי", step: 0.1 },
    },
  },
  diamondStore: {
    label: "חנות יהלומים — רכישה",
    icon: "💎",
    fields: {
      purchaseDiscountPct: { label: "אחוז הנחה על מחירי חבילות יהלומים (0-100)" },
    },
  },
};

/**
 * Hard bounds for every tunable, enforced on both the write and the read path.
 *
 * These are safety rails, not balance opinions — they only rule out values that
 * break a game invariant outright. The costs in particular must stay >= 1: the
 * spend sites test `if (empire.turns < ATTACK_TURN_COST)` and then decrement by
 * that same figure, so a negative cost passes the affordability check and the
 * decrement *adds* turns, minting them without limit for every player at once.
 * Rates that feed multiplications are kept non-negative so resources can never
 * be driven below zero by a sign flip.
 */
const TUNABLE_BOUNDS: {
  [G in keyof GameTunables]: { [F in keyof GameTunables[G]]: [number, number] };
} = {
  starting: {
    gold: [0, 1e12],
    wood: [0, 1e12],
    iron: [0, 1e12],
    stone: [0, 1e12],
    diamonds: [0, 1e9],
    citizens: [0, 1e9],
    turns: [0, 1e9],
    soldiers: [0, 1e9],
    spies: [0, 1e9],
    mineSlaves: [0, 1e9],
    slavesPerMine: [0, 1e6],
    wheelSpins: [0, 1e4],
  },
  daily: {
    citizensBase: [0, 1e6],
    citizensPerLevel: [0, 1e6],
    wheelSpins: [0, 1e4],
  },
  battle: {
    defenseBonus: [0, 1e3],
    plunderRate: [0, 1],
    enslaveRate: [0, 1],
    enslaveMinSoldiers: [0, 1e9],
    // Must be >= 1 — see the note above; 0 would also make attacks free.
    attackTurnCost: [1, 1e6],
    spyTurnCost: [1, 1e6],
  },
  economy: {
    mineProductionMultiplier: [0, 1e3],
  },
  diamondStore: {
    purchaseDiscountPct: [0, 100],
  },
};

function mergeGroup<T extends Record<string, number>>(
  base: T,
  overlay: unknown,
  bounds: Record<string, [number, number]>
): T {
  if (!overlay || typeof overlay !== "object") return { ...base };
  const result = { ...base };
  for (const key of Object.keys(base) as (keyof T)[]) {
    const value = (overlay as Record<string, unknown>)[key as string];
    if (typeof value === "number" && Number.isFinite(value)) {
      const [min, max] = bounds[key as string] ?? [-Infinity, Infinity];
      result[key] = Math.min(max, Math.max(min, value)) as T[keyof T];
    }
  }
  return result;
}

/** Merge a persisted overlay over the defaults, keeping only known numeric fields. */
export function mergeTunables(overlay: unknown): GameTunables {
  const o = (overlay ?? {}) as Record<string, unknown>;
  return {
    starting: mergeGroup(DEFAULT_TUNABLES.starting, o.starting, TUNABLE_BOUNDS.starting),
    daily: mergeGroup(DEFAULT_TUNABLES.daily, o.daily, TUNABLE_BOUNDS.daily),
    battle: mergeGroup(DEFAULT_TUNABLES.battle, o.battle, TUNABLE_BOUNDS.battle),
    economy: mergeGroup(DEFAULT_TUNABLES.economy, o.economy, TUNABLE_BOUNDS.economy),
    diamondStore: mergeGroup(
      DEFAULT_TUNABLES.diamondStore,
      o.diamondStore,
      TUNABLE_BOUNDS.diamondStore
    ),
  };
}

/**
 * The live, merged game tunables. React-cached per request so the many
 * callers within a single request/transaction share one DB read.
 */
export const getTunables = cache(async (): Promise<GameTunables> => {
  const row = await prisma.gameConfig.findUnique({ where: { id: "singleton" } });
  return mergeTunables(row?.data);
});
