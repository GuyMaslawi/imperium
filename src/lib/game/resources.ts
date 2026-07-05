import type { Building } from "@prisma/client";
import { BUILDING_META, mineProductionPerTick } from "./constants";

/** Resources produced by a mine per regular (5-minute) update. */
export function productionPerTick(building: Building): number {
  const meta = BUILDING_META[building.type];
  if (!meta.producedResource) return 0;
  return mineProductionPerTick(building.level, building.slavesAssigned);
}
