import { GridEngine } from '../core/GridEngine';
import {
  BUILDING_CONFIG,
  CELL_SIZE,
  DENSITY_TO_BUILDING,
  SECTOR_DENSITY_CONFIG,
} from '../core/constants';
import { BuildingType, type Building, type Sector } from '../types';
import type { Cell } from '../core/Cell';

let nextBuildingId = 0;

export class BuildingGenerator {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  generate(sectors: Sector[]): Building[] {
    nextBuildingId = 0;
    const buildings: Building[] = [];

    for (const sector of sectors) {
      buildings.push(...this.generateSectorBuildings(sector));
    }

    return buildings;
  }

  private generateSectorBuildings(sector: Sector): Building[] {
    const config = SECTOR_DENSITY_CONFIG[sector.density];
    const buildingType = DENSITY_TO_BUILDING[sector.density];
    const bConfig = BUILDING_CONFIG[buildingType];

    const count =
      config.buildingCount[0] +
      Math.floor(Math.random() * (config.buildingCount[1] - config.buildingCount[0] + 1));

    // Prefer cells adjacent to roads (frontage) but never on roads
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
      // Footprint is a fraction of CELL_SIZE — building fits inside one cell
      const width = CELL_SIZE * footprint;
      const depth = CELL_SIZE * (footprint * (0.85 + Math.random() * 0.15));
      const height =
        CELL_SIZE *
        (config.heightRange[0] +
          Math.random() * (config.heightRange[1] - config.heightRange[0]));

      const color = bConfig.colors[Math.floor(Math.random() * bConfig.colors.length)];
      const roofColor = bConfig.roofColors[Math.floor(Math.random() * bConfig.roofColors.length)];

      const popPerBuilding = Math.floor(
        (config.populationRange[0] +
          Math.random() * (config.populationRange[1] - config.populationRange[0])) /
          Math.max(count, 1)
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

  getBuildingsBySector(buildings: Building[], sectorId: number): Building[] {
    return buildings.filter((b) => b.sectorId === sectorId);
  }
}

export function getBuildingTypeForDensity(sector: Sector): BuildingType {
  return DENSITY_TO_BUILDING[sector.density];
}
