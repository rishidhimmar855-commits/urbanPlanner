import { Cell } from '../core/Cell';
import { TerrainType } from '../types';
import { CELL_SIZE } from './constants';

export class GridEngine {
  private cells: Cell[][] = [];
  private flatCells: Cell[] = [];
  width = 0;
  height = 0;

  initialize(terrainGrid: TerrainType[][]): void {
    Cell.resetIdCounter();
    this.width = terrainGrid[0]?.length ?? 0;
    this.height = terrainGrid.length;
    this.cells = [];
    this.flatCells = [];

    const offsetX = (this.width * CELL_SIZE) / 2;
    const offsetZ = (this.height * CELL_SIZE) / 2;

    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        const cell = new Cell(x, y, terrainGrid[y][x]);
        cell.worldPosition.x -= offsetX;
        cell.worldPosition.z -= offsetZ;
        row.push(cell);
        this.flatCells.push(cell);
      }
      this.cells.push(row);
    }
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.cells[y][x];
  }

  getCellById(id: number): Cell | null {
    return this.flatCells.find((c) => c.id === id) ?? null;
  }

  getAllCells(): Cell[] {
    return this.flatCells;
  }

  getCellsByTerrain(type: TerrainType): Cell[] {
    return this.flatCells.filter((c) => c.terrainType === type);
  }

  getCellsBySector(sectorId: number): Cell[] {
    return this.flatCells.filter((c) => c.sectorId === sectorId);
  }

  getNeighbors(x: number, y: number): Cell[] {
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];
    const result: Cell[] = [];
    for (const [dx, dy] of dirs) {
      const cell = this.getCell(x + dx, y + dy);
      if (cell) result.push(cell);
    }
    return result;
  }

  getNeighbors8(x: number, y: number): Cell[] {
    const result: Cell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const cell = this.getCell(x + dx, y + dy);
        if (cell) result.push(cell);
      }
    }
    return result;
  }

  floodFill(startX: number, startY: number, predicate: (c: Cell) => boolean): Cell[] {
    const start = this.getCell(startX, startY);
    if (!start || !predicate(start)) return [];

    const visited = new Set<number>();
    const queue: Cell[] = [start];
    const result: Cell[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      result.push(current);

      for (const neighbor of this.getNeighbors(current.gridX, current.gridY)) {
        if (!visited.has(neighbor.id) && predicate(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    if (this.flatCells.length === 0) {
      return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
    }
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const cell of this.flatCells) {
      minX = Math.min(minX, cell.worldPosition.x);
      maxX = Math.max(maxX, cell.worldPosition.x);
      minZ = Math.min(minZ, cell.worldPosition.z);
      maxZ = Math.max(maxZ, cell.worldPosition.z);
    }
    return { minX, maxX, minZ, maxZ };
  }
}
