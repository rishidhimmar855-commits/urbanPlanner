import { GridEngine } from '../core/GridEngine';
import {
  AMENITY_META,
  BUILDING_CONFIG,
  CELL_SIZE,
  DENSITY_TO_BUILDING,
  PLAN_STYLE_META,
  SECTOR_DENSITY_CONFIG,
} from '../core/constants';
import {
  BuildingType,
  type AmenityRequest,
  type Building,
  type GenerationConfig,
  type PlanStyle,
  type Sector,
} from '../types';
import type { Cell } from '../core/Cell';

let nextBuildingId = 0;

export class BuildingGenerator {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  generate(sectors: Sector[], config?: GenerationConfig): Building[] {
    nextBuildingId = 0;
    const style: PlanStyle = config?.style ?? 'balanced';
    const scale = PLAN_STYLE_META[style].buildingScale;
    const buildings: Building[] = [];

    for (const sector of sectors) {
      buildings.push(...this.generateSectorBuildings(sector, scale));
    }

    if (config?.amenities?.length) {
      const amenityScale = PLAN_STYLE_META[style].amenityScale;
      const scaledAmenities = config.amenities.map((a) => ({
        ...a,
        count: Math.max(0, Math.round(a.count * amenityScale)),
      }));
      buildings.push(...this.placeAmenities(sectors, scaledAmenities));
    }

    // Soft-target expected population by scaling sector pop if far off
    if (config?.expectedPopulation && sectors.length > 0) {
      const current = sectors.reduce((s, sec) => s + sec.simulationData.population, 0);
      if (current > 0) {
        const factor = config.expectedPopulation / current;
        const clamped = Math.max(0.5, Math.min(2.2, factor));
        for (const sector of sectors) {
          sector.simulationData.population = Math.round(
            sector.simulationData.population * clamped
          );
          sector.simulationData.employment = Math.floor(
            sector.simulationData.population * (0.4 + Math.random() * 0.25)
          );
        }
        for (const b of buildings) {
          if (
            b.type === BuildingType.House ||
            b.type === BuildingType.Apartment ||
            b.type === BuildingType.Tower ||
            b.type === BuildingType.Commercial
          ) {
            b.population = Math.max(1, Math.round(b.population * clamped));
          }
        }
      }
    }

    return buildings;
  }

  private generateSectorBuildings(sector: Sector, scale: number): Building[] {
    const config = SECTOR_DENSITY_CONFIG[sector.density];
    const buildingType = DENSITY_TO_BUILDING[sector.density];
    const bConfig = BUILDING_CONFIG[buildingType];

    const baseCount =
      config.buildingCount[0] +
      Math.floor(Math.random() * (config.buildingCount[1] - config.buildingCount[0] + 1));
    const count = Math.max(1, Math.round(baseCount * scale));

    const parcels = sector.cellIds
      .map((id) => this.grid.getCellById(id))
      .filter((c): c is Cell => c !== null && c.roadId === null && c.buildingId === null);

    const withFrontage = parcels.filter((c) =>
      this.grid.getNeighbors(c.gridX, c.gridY).some((n) => n.roadId !== null)
    );
    const pool = (withFrontage.length >= count ? withFrontage : parcels).sort(
      () => Math.random() - 0.5
    );

    const buildings: Building[] = [];
    let totalPopulation = 0;

    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const cell = pool[i];
      const footprint =
        bConfig.footprint[0] + Math.random() * (bConfig.footprint[1] - bConfig.footprint[0]);
      const width = CELL_SIZE * footprint;
      const depth = CELL_SIZE * (footprint * (0.85 + Math.random() * 0.15));
      const height =
        CELL_SIZE *
        (config.heightRange[0] +
          Math.random() * (config.heightRange[1] - config.heightRange[0]));

      const color = bConfig.colors[Math.floor(Math.random() * bConfig.colors.length)];
      const roofColor = bConfig.roofColors[Math.floor(Math.random() * bConfig.roofColors.length)];

      const popPerBuilding = Math.floor(
        ((config.populationRange[0] +
          Math.random() * (config.populationRange[1] - config.populationRange[0])) /
          Math.max(count, 1)) *
          scale
      );

      const building: Building = {
        id: nextBuildingId++,
        sectorId: sector.id,
        cellId: cell.id,
        type: buildingType,
        position: [cell.worldPosition.x, cell.elevation, cell.worldPosition.z],
        width,
        height,
        depth,
        color,
        roofColor,
        population: popPerBuilding,
      };

      cell.buildingId = building.id;
      buildings.push(building);
      totalPopulation += popPerBuilding;
    }

    sector.simulationData.population = totalPopulation;
    sector.simulationData.employment = Math.floor(totalPopulation * (0.4 + Math.random() * 0.3));

    return buildings;
  }

  private placeAmenities(sectors: Sector[], amenities: AmenityRequest[]): Building[] {
    if (sectors.length === 0) return [];
    const placed: Building[] = [];
    const sorted = [...sectors].sort((a, b) => {
      const rank = (d: string) => (d === 'high' ? 0 : d === 'medium' ? 1 : 2);
      return rank(a.density) - rank(b.density);
    });

    for (const req of amenities) {
      const meta = AMENITY_META[req.type];
      const bConfig = BUILDING_CONFIG[meta.buildingType];
      for (let n = 0; n < req.count; n++) {
        const sector = sorted[(placed.length + n) % sorted.length];
        const cell = this.pickAmenityCell(sector, req.type);
        if (!cell) continue;

        const footprint =
          bConfig.footprint[0] + Math.random() * (bConfig.footprint[1] - bConfig.footprint[0]);
        const heightMult =
          meta.buildingType === BuildingType.Park
            ? 0.35
            : meta.buildingType === BuildingType.Hospital
              ? 2.8
              : meta.buildingType === BuildingType.Railway
                ? 2.2
                : 1.6;

        const building: Building = {
          id: nextBuildingId++,
          sectorId: sector.id,
          cellId: cell.id,
          type: meta.buildingType,
          position: [cell.worldPosition.x, cell.elevation, cell.worldPosition.z],
          width: CELL_SIZE * footprint,
          height: CELL_SIZE * heightMult,
          depth: CELL_SIZE * footprint * 0.9,
          color: bConfig.colors[n % bConfig.colors.length],
          roofColor: bConfig.roofColors[n % bConfig.roofColors.length],
          population: 0,
        };
        cell.buildingId = building.id;
        placed.push(building);
        sector.simulationData.happiness = Math.min(
          98,
          sector.simulationData.happiness + 2
        );
      }
    }

    return placed;
  }

  private pickAmenityCell(sector: Sector, type: AmenityRequest['type']): Cell | null {
    const parcels = sector.cellIds
      .map((id) => this.grid.getCellById(id))
      .filter((c): c is Cell => c !== null && c.roadId === null && c.buildingId === null);

    if (parcels.length === 0) return null;

    const withFrontage = parcels.filter((c) =>
      this.grid.getNeighbors(c.gridX, c.gridY).some((n) => n.roadId !== null)
    );

    const preferFrontage = type === 'bus_stand' || type === 'railway' || type === 'market';
    const pool = preferFrontage && withFrontage.length > 0 ? withFrontage : parcels;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  getBuildingsBySector(buildings: Building[], sectorId: number): Building[] {
    return buildings.filter((b) => b.sectorId === sectorId);
  }
}

export function getBuildingTypeForDensity(sector: Sector): BuildingType {
  return DENSITY_TO_BUILDING[sector.density];
}
