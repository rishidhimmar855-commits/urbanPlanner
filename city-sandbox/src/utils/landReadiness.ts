import {
  TerrainType,
  type AmenityRequest,
  type AmenitySuitability,
  type AmenityType,
  type CityType,
  type LandReadinessReport,
  type Suitability,
} from '../types';
import { AMENITY_META } from '../core/constants';

const ALL_AMENITIES: AmenityType[] = [
  'hospital',
  'school',
  'bus_stand',
  'railway',
  'park',
  'market',
];

export function analyzeLandReadiness(
  terrainGrid: TerrainType[][],
  expectedPopulation: number,
  cityType: CityType
): LandReadinessReport {
  const counts: Record<TerrainType, number> = {
    [TerrainType.HighFertility]: 0,
    [TerrainType.LowFertility]: 0,
    [TerrainType.HighMinerals]: 0,
    [TerrainType.Water]: 0,
    [TerrainType.Forest]: 0,
  };

  let total = 0;
  for (const row of terrainGrid) {
    for (const cell of row) {
      counts[cell]++;
      total++;
    }
  }

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const buildablePercent = pct(counts[TerrainType.LowFertility]);
  const fertilePercent = pct(counts[TerrainType.HighFertility]);
  const forestPercent = pct(counts[TerrainType.Forest]);
  const waterPercent = pct(counts[TerrainType.Water]);
  const mineralPercent = pct(counts[TerrainType.HighMinerals]);

  // Score: prefer buildable land, some water/forest ok, excess minerals hurt
  let overallScore =
    buildablePercent * 0.7 +
    Math.min(waterPercent, 15) * 0.4 +
    Math.min(forestPercent, 20) * 0.3 +
    Math.min(fertilePercent, 25) * 0.2 -
    Math.max(0, mineralPercent - 10) * 0.5;
  overallScore = Math.max(0, Math.min(100, Math.round(overallScore)));

  let summary: string;
  if (buildablePercent < 15) {
    summary =
      'Limited buildable (low-fertility) land. Consider a compact plan or expand the city footprint.';
  } else if (overallScore >= 70) {
    summary =
      'Land is well suited for urban development. Low-fertility parcels support a balanced sector city.';
  } else if (overallScore >= 45) {
    summary =
      'Moderate suitability. Protect fertile farms and forests; concentrate development on tan buildable zones.';
  } else {
    summary =
      'Challenging terrain. Expect higher land-prep costs and tighter amenity placement constraints.';
  }

  const amenityAdvice = ALL_AMENITIES.map((type) =>
    adviseAmenity(type, counts, total, expectedPopulation, cityType, buildablePercent)
  );

  return {
    totalCells: total,
    buildablePercent: round1(buildablePercent),
    fertilePercent: round1(fertilePercent),
    forestPercent: round1(forestPercent),
    waterPercent: round1(waterPercent),
    mineralPercent: round1(mineralPercent),
    overallScore,
    summary,
    terrainCounts: counts,
    amenityAdvice,
  };
}

function adviseAmenity(
  type: AmenityType,
  counts: Record<TerrainType, number>,
  total: number,
  population: number,
  cityType: CityType,
  buildablePercent: number
): AmenitySuitability {
  const meta = AMENITY_META[type];
  let recommendedCount = Math.max(1, Math.ceil(population / meta.popPerUnit));

  if (cityType === 'green' && type === 'park') recommendedCount = Math.ceil(recommendedCount * 1.5);
  if (cityType === 'transit' && (type === 'bus_stand' || type === 'railway')) {
    recommendedCount = Math.ceil(recommendedCount * 1.4);
  }
  if (cityType === 'residential' && type === 'school') {
    recommendedCount = Math.ceil(recommendedCount * 1.3);
  }
  if (cityType === 'industrial' && type === 'market') {
    recommendedCount = Math.max(1, recommendedCount - 1);
  }

  // Cap railway for small cities
  if (type === 'railway' && population < 40_000) recommendedCount = 0;
  if (type === 'railway' && population >= 40_000) recommendedCount = Math.min(2, recommendedCount);

  const { suitability, reason } = suitabilityFor(type, counts, total, buildablePercent);

  return {
    type,
    label: meta.label,
    suitability,
    reason,
    recommendedCount,
  };
}

function suitabilityFor(
  type: AmenityType,
  counts: Record<TerrainType, number>,
  total: number,
  buildablePercent: number
): { suitability: Suitability; reason: string } {
  const waterPct = (counts[TerrainType.Water] / Math.max(total, 1)) * 100;
  const mineralPct = (counts[TerrainType.HighMinerals] / Math.max(total, 1)) * 100;
  const forestPct = (counts[TerrainType.Forest] / Math.max(total, 1)) * 100;

  if (buildablePercent < 10) {
    return {
      suitability: 'unsuitable',
      reason: 'Too little low-fertility land to site civic amenities safely.',
    };
  }

  switch (type) {
    case 'hospital':
    case 'school':
    case 'market':
      if (buildablePercent >= 25) {
        return {
          suitability: 'ready',
          reason: 'Enough buildable soil near proposed sectors for civic buildings.',
        };
      }
      return {
        suitability: 'caution',
        reason: 'Limited parcels — place near arterial roads and medium-density sectors.',
      };
    case 'bus_stand':
      if (buildablePercent >= 20) {
        return {
          suitability: 'ready',
          reason: 'Arterial corridors on low-fertility land can host bus terminals.',
        };
      }
      return {
        suitability: 'caution',
        reason: 'Place only on primary road edges; avoid fertile farmland.',
      };
    case 'railway':
      if (mineralPct > 35) {
        return {
          suitability: 'caution',
          reason: 'Steep mineral / hill zones nearby may raise earthworks cost.',
        };
      }
      if (buildablePercent >= 20) {
        return {
          suitability: 'ready',
          reason: 'Buildable edge parcels can support a station and approach tracks.',
        };
      }
      return {
        suitability: 'caution',
        reason: 'Site on the city edge where land prep is cheapest.',
      };
    case 'park':
      if (forestPct >= 8 || waterPct >= 5) {
        return {
          suitability: 'ready',
          reason: 'Existing forest / water edges make strong park corridors.',
        };
      }
      if (buildablePercent >= 15) {
        return {
          suitability: 'ready',
          reason: 'Reserve low-density sector corners as green pockets.',
        };
      }
      return {
        suitability: 'caution',
        reason: 'Protect remaining forest rather than clearing new parkland.',
      };
    default:
      return { suitability: 'ready', reason: 'Compatible with planned sectors.' };
  }
}

export function suggestAmenitiesFromAdvice(
  advice: AmenitySuitability[],
  styleScale = 1
): AmenityRequest[] {
  return advice
    .filter((a) => a.recommendedCount > 0 && a.suitability !== 'unsuitable')
    .map((a) => ({
      type: a.type,
      label: a.label,
      count: Math.max(0, Math.round(a.recommendedCount * styleScale)),
    }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
