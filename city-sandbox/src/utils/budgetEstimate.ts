import {
  BuildingType,
  type BudgetBreakdown,
  type Building,
  type RoadSegment,
  type AmenityRequest,
  type PlanStyle,
} from '../types';
import {
  AMENITY_META,
  COST_LAND_PREP_PER_CELL,
  COST_PER_APARTMENT,
  COST_PER_COMMERCIAL,
  COST_PER_HOUSE,
  COST_PER_ROAD,
  COST_PER_TOWER,
  PLAN_STYLE_META,
} from '../core/constants';

const BUILDING_COST: Partial<Record<BuildingType, number>> = {
  [BuildingType.House]: COST_PER_HOUSE,
  [BuildingType.Apartment]: COST_PER_APARTMENT,
  [BuildingType.Tower]: COST_PER_TOWER,
  [BuildingType.Commercial]: COST_PER_COMMERCIAL,
};

export function estimateBudget(
  roads: RoadSegment[],
  buildings: Building[],
  amenities: AmenityRequest[],
  landPrepCells: number,
  style: PlanStyle
): BudgetBreakdown {
  const scale = PLAN_STYLE_META[style].costScale;

  const roadCost = roads.length * COST_PER_ROAD;

  let buildingCost = 0;
  let amenityCost = 0;
  for (const b of buildings) {
    const amenityEntry = Object.values(AMENITY_META).find((m) => m.buildingType === b.type);
    if (amenityEntry) {
      amenityCost += amenityEntry.unitCost;
    } else {
      buildingCost += BUILDING_COST[b.type] ?? COST_PER_HOUSE;
    }
  }

  // Ensure requested amenities are counted even if placement clipped
  for (const req of amenities) {
    const meta = AMENITY_META[req.type];
    const placed = buildings.filter((b) => b.type === meta.buildingType).length;
    if (placed < req.count) {
      amenityCost += (req.count - placed) * meta.unitCost;
    }
  }

  const landPrep = landPrepCells * COST_LAND_PREP_PER_CELL;

  const roadsScaled = Math.round(roadCost * scale);
  const buildingsScaled = Math.round(buildingCost * scale);
  const amenitiesScaled = Math.round(amenityCost * scale);
  const landScaled = Math.round(landPrep * scale);

  return {
    roads: roadsScaled,
    buildings: buildingsScaled,
    amenities: amenitiesScaled,
    landPrep: landScaled,
    total: roadsScaled + buildingsScaled + amenitiesScaled + landScaled,
  };
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `₹${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return `₹${amount}`;
}
