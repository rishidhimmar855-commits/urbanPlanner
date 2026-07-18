import { GridEngine } from '../core/GridEngine';
import { TerrainType, type TreeInstance, type RockInstance } from '../types';

/** Sparse vegetation — one tree per N forest cells, no per-cell flooding. */
const FOREST_STEP = 4;
const FERTILITY_STEP = 8;
const ROCK_CHANCE = 0.08;

export class VegetationGenerator {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  generate(): { trees: TreeInstance[]; rocks: RockInstance[] } {
    const trees: TreeInstance[] = [];
    const rocks: RockInstance[] = [];

    const forestCells = this.grid.getCellsByTerrain(TerrainType.Forest);
    const fertilityCells = this.grid.getCellsByTerrain(TerrainType.HighFertility);

    for (let i = 0; i < forestCells.length; i += FOREST_STEP) {
      const cell = forestCells[i];
      trees.push({
        position: [
          cell.worldPosition.x + (Math.random() - 0.5) * 1.2,
          cell.elevation,
          cell.worldPosition.z + (Math.random() - 0.5) * 1.2,
        ],
        scale: 0.9 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
      });

      if (Math.random() < ROCK_CHANCE) {
        rocks.push({
          position: [
            cell.worldPosition.x + (Math.random() - 0.5),
            cell.elevation,
            cell.worldPosition.z + (Math.random() - 0.5),
          ],
          scale: 0.3 + Math.random() * 0.4,
        });
      }
    }

    for (let i = 0; i < fertilityCells.length; i += FERTILITY_STEP) {
      if (Math.random() > 0.5) continue;
      const cell = fertilityCells[i];
      trees.push({
        position: [
          cell.worldPosition.x + (Math.random() - 0.5),
          cell.elevation,
          cell.worldPosition.z + (Math.random() - 0.5),
        ],
        scale: 0.5 + Math.random() * 0.3,
        rotation: Math.random() * Math.PI * 2,
      });
    }

    return { trees, rocks };
  }
}
