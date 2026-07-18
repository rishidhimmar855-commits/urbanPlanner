import { GridEngine } from '../core/GridEngine';
import { CELL_SIZE, TERRAIN_ELEVATION, TERRAIN_COLORS } from '../core/constants';
import { TerrainType } from '../types';
import type { Cell } from '../core/Cell';

export interface TerrainMeshData {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  vertexCount: number;
}

export class TerrainEngine {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  smoothElevations(iterations = 2): void {
    const cells = this.grid.getAllCells();
    for (let iter = 0; iter < iterations; iter++) {
      const newElevations = new Map<number, number>();
      for (const cell of cells) {
        const neighbors = this.grid.getNeighbors8(cell.gridX, cell.gridY);
        let sum = cell.elevation;
        let count = 1;
        for (const n of neighbors) {
          sum += n.elevation;
          count++;
        }
        newElevations.set(cell.id, sum / count);
      }
      for (const cell of cells) {
        const smoothed = newElevations.get(cell.id)!;
        cell.elevation = smoothed;
        cell.worldPosition.y = smoothed;
      }
    }
  }

  generateMesh(): TerrainMeshData {
    const w = this.grid.width;
    const h = this.grid.height;
    const vertexCount = w * h;
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    const colorMap: Record<TerrainType, [number, number, number]> = {
      [TerrainType.HighFertility]: [0.3, 0.69, 0.31],
      [TerrainType.LowFertility]: [0.78, 0.72, 0.59],
      [TerrainType.HighMinerals]: [0.47, 0.33, 0.28],
      [TerrainType.Water]: [0.13, 0.59, 0.95],
      [TerrainType.Forest]: [0.11, 0.37, 0.13],
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = this.grid.getCell(x, y)!;
        const idx = (y * w + x) * 3;
        positions[idx] = cell.worldPosition.x;
        positions[idx + 1] = cell.elevation;
        positions[idx + 2] = cell.worldPosition.z;

        const c = colorMap[cell.terrainType];
        colors[idx] = c[0];
        colors[idx + 1] = c[1];
        colors[idx + 2] = c[2];

        normals[idx] = 0;
        normals[idx + 1] = 1;
        normals[idx + 2] = 0;
      }
    }

    const quadCount = (w - 1) * (h - 1);
    const indices = new Uint32Array(quadCount * 6);
    let iIdx = 0;

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const tl = y * w + x;
        const tr = tl + 1;
        const bl = (y + 1) * w + x;
        const br = bl + 1;

        indices[iIdx++] = tl;
        indices[iIdx++] = bl;
        indices[iIdx++] = tr;
        indices[iIdx++] = tr;
        indices[iIdx++] = bl;
        indices[iIdx++] = br;
      }
    }

    this.computeNormals(positions, indices, normals, vertexCount);

    return { positions, colors, indices, normals, vertexCount };
  }

  private computeNormals(
    positions: Float32Array,
    indices: Uint32Array,
    normals: Float32Array,
    vertexCount: number
  ): void {
    normals.fill(0);
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      const ax = positions[i1] - positions[i0];
      const ay = positions[i1 + 1] - positions[i0 + 1];
      const az = positions[i1 + 2] - positions[i0 + 2];
      const bx = positions[i2] - positions[i0];
      const by = positions[i2 + 1] - positions[i0 + 1];
      const bz = positions[i2 + 2] - positions[i0 + 2];

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;

      for (const idx of [i0, i1, i2]) {
        normals[idx] += nx;
        normals[idx + 1] += ny;
        normals[idx + 2] += nz;
      }
    }

    for (let i = 0; i < vertexCount; i++) {
      const idx = i * 3;
      const len = Math.sqrt(normals[idx] ** 2 + normals[idx + 1] ** 2 + normals[idx + 2] ** 2) || 1;
      normals[idx] /= len;
      normals[idx + 1] /= len;
      normals[idx + 2] /= len;
    }
  }

  getWaterCells(): Cell[] {
    return this.grid.getCellsByTerrain(TerrainType.Water);
  }

  getElevationAt(x: number, z: number): number {
    const gx = Math.round(x / CELL_SIZE + this.grid.width / 2);
    const gy = Math.round(z / CELL_SIZE + this.grid.height / 2);
    const cell = this.grid.getCell(gx, gy);
    return cell?.elevation ?? TERRAIN_ELEVATION[TerrainType.LowFertility];
  }
}

export function getTerrainColor(type: TerrainType): string {
  return TERRAIN_COLORS[type];
}
