import { GridEngine } from '../core/GridEngine';
import { SECTOR_DENSITY_CONFIG, SECTOR_PLAN } from '../core/constants';
import { TerrainType, SectorDensity, type Sector } from '../types';
import type { Cell } from '../core/Cell';

let nextSectorId = 0;

export interface CityPlan {
  sectors: Sector[];
  /** Arterial corridor X coordinates (full columns painted as primary roads) */
  arterialXs: number[];
  /** Arterial corridor Y coordinates (full rows painted as primary roads) */
  arterialYs: number[];
  /** Buildable city AABB used for the plan */
  cityBounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Gandhinagar-style sectorization:
 * 1. Find the largest contiguous buildable region (low fertility)
 * 2. Overlay a regular arterial road grid
 * 3. Each rectangular block BETWEEN arterials becomes a numbered Sector
 */
export class SectorGenerator {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  generate(): CityPlan {
    nextSectorId = 0;

    const region = this.findLargestBuildableRegion();
    if (region.length === 0) {
      return { sectors: [], arterialXs: [], arterialYs: [], cityBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    }

    const minX = Math.min(...region.map((c) => c.gridX));
    const maxX = Math.max(...region.map((c) => c.gridX));
    const minY = Math.min(...region.map((c) => c.gridY));
    const maxY = Math.max(...region.map((c) => c.gridY));

    const { sectorSize, arterialWidth, minCells } = SECTOR_PLAN;
    const pitch = sectorSize + arterialWidth;

    const arterialXs: number[] = [];
    const arterialYs: number[] = [];

    for (let x = minX; x <= maxX; x += pitch) arterialXs.push(x);
    // Ensure a closing arterial on the far edge when space allows
    if (arterialXs[arterialXs.length - 1] !== maxX && maxX - arterialXs[arterialXs.length - 1] > 1) {
      arterialXs.push(Math.min(maxX, arterialXs[arterialXs.length - 1] + pitch));
    }

    for (let y = minY; y <= maxY; y += pitch) arterialYs.push(y);
    if (arterialYs[arterialYs.length - 1] !== maxY && maxY - arterialYs[arterialYs.length - 1] > 1) {
      arterialYs.push(Math.min(maxY, arterialYs[arterialYs.length - 1] + pitch));
    }

    const buildable = new Set(region.map((c) => `${c.gridX},${c.gridY}`));
    const sectors: Sector[] = [];
    let sectorNumber = 1;

    for (let row = 0; row < arterialYs.length - 1; row++) {
      for (let col = 0; col < arterialXs.length - 1; col++) {
        const bMinX = arterialXs[col] + arterialWidth;
        const bMaxX = arterialXs[col + 1] - 1;
        const bMinY = arterialYs[row] + arterialWidth;
        const bMaxY = arterialYs[row + 1] - 1;

        if (bMaxX < bMinX || bMaxY < bMinY) continue;

        const cells: Cell[] = [];
        for (let y = bMinY; y <= bMaxY; y++) {
          for (let x = bMinX; x <= bMaxX; x++) {
            if (!buildable.has(`${x},${y}`)) continue;
            const cell = this.grid.getCell(x, y);
            if (cell && cell.terrainType === TerrainType.LowFertility && cell.sectorId === null) {
              cells.push(cell);
            }
          }
        }

        if (cells.length < minCells) continue;

        const sector = this.createSector(cells, sectorNumber, col, row, {
          minX: bMinX,
          maxX: bMaxX,
          minY: bMinY,
          maxY: bMaxY,
        });
        sectors.push(sector);
        for (const c of cells) c.sectorId = sector.id;
        sectorNumber++;
      }
    }

    return {
      sectors,
      arterialXs,
      arterialYs,
      cityBounds: { minX, maxX, minY, maxY },
    };
  }

  private findLargestBuildableRegion(): Cell[] {
    const all = this.grid.getCellsByTerrain(TerrainType.LowFertility);
    const visited = new Set<number>();
    let best: Cell[] = [];

    for (const start of all) {
      if (visited.has(start.id)) continue;
      const region = this.grid.floodFill(
        start.gridX,
        start.gridY,
        (c) => c.terrainType === TerrainType.LowFertility && c.sectorId === null
      );
      for (const c of region) visited.add(c.id);
      if (region.length > best.length) best = region;
    }

    return best;
  }

  private createSector(
    cells: Cell[],
    number: number,
    gridCol: number,
    gridRow: number,
    bounds: Sector['bounds']
  ): Sector {
    const id = nextSectorId++;
    // Density varies by ring from city center of the plan
    const density = this.pickDensity(gridCol, gridRow);
    const config = SECTOR_DENSITY_CONFIG[density];

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    return {
      id,
      name: `Sector ${number}`,
      gridCol,
      gridRow,
      bounds,
      cellIds: cells.map((c) => c.id),
      boundary: this.rectBoundary(bounds),
      center: [centerX, centerY],
      area: cells.length,
      density,
      color: config.color,
      simulationData: {
        population: 0,
        employment: 0,
        vehicles: 0,
        pollution: 0,
        traffic: 0,
        electricity: 0,
        waterUsage: 0,
        waste: 0,
        happiness: 50 + Math.random() * 30,
        averageIncome: 20000 + Math.random() * 60000,
      },
    };
  }

  private pickDensity(col: number, row: number): SectorDensity {
    // Inner sectors denser — like a planned capital core
    const roll = (col + row) % 5;
    if (roll <= 1) return SectorDensity.High;
    if (roll <= 3) return SectorDensity.Medium;
    return SectorDensity.Low;
  }

  /** Clockwise rectangle outline for sector borders (Gandhinagar blocks). */
  private rectBoundary(bounds: Sector['bounds']): [number, number][] {
    const { minX, maxX, minY, maxY } = bounds;
    const pts: [number, number][] = [];
    for (let x = minX; x <= maxX; x++) pts.push([x, minY]);
    for (let y = minY + 1; y <= maxY; y++) pts.push([maxX, y]);
    for (let x = maxX - 1; x >= minX; x--) pts.push([x, maxY]);
    for (let y = maxY - 1; y > minY; y--) pts.push([minX, y]);
    return pts;
  }
}
