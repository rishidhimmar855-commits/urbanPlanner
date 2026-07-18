import { Vector3 } from 'three';
import type { CellData, SimulationData } from '../types';
import { TerrainType } from '../types';
import { CELL_SIZE, TERRAIN_ELEVATION, TERRAIN_PROPERTIES } from './constants';

let nextCellId = 0;

export class Cell {
  id: number;
  gridX: number;
  gridY: number;
  worldPosition: Vector3;
  terrainType: TerrainType;
  elevation: number;
  fertility: number;
  mineralDensity: number;
  waterDepth: number;
  forestDensity: number;
  sectorId: number | null = null;
  districtId: number | null = null;
  roadId: number | null = null;
  buildingId: number | null = null;
  simulationData: Partial<SimulationData> = {};

  constructor(gridX: number, gridY: number, terrainType: TerrainType) {
    this.id = nextCellId++;
    this.gridX = gridX;
    this.gridY = gridY;
    this.terrainType = terrainType;

    const props = TERRAIN_PROPERTIES[terrainType];
    this.elevation = TERRAIN_ELEVATION[terrainType];
    this.fertility = props.fertility;
    this.mineralDensity = props.mineralDensity;
    this.waterDepth = props.waterDepth;
    this.forestDensity = props.forestDensity;

    const wx = (gridX - 0) * CELL_SIZE;
    const wz = (gridY - 0) * CELL_SIZE;
    this.worldPosition = new Vector3(wx, this.elevation, wz);
  }

  toData(): CellData {
    return {
      id: this.id,
      gridX: this.gridX,
      gridY: this.gridY,
      worldPosition: this.worldPosition.clone(),
      terrainType: this.terrainType,
      elevation: this.elevation,
      fertility: this.fertility,
      mineralDensity: this.mineralDensity,
      waterDepth: this.waterDepth,
      forestDensity: this.forestDensity,
      sectorId: this.sectorId,
      districtId: this.districtId,
      roadId: this.roadId,
      buildingId: this.buildingId,
      simulationData: { ...this.simulationData },
    };
  }

  static resetIdCounter(): void {
    nextCellId = 0;
  }
}

export function gridToWorld(gridX: number, gridY: number, elevation = 0): Vector3 {
  return new Vector3(gridX * CELL_SIZE, elevation, gridY * CELL_SIZE);
}

export function worldToGrid(worldX: number, worldZ: number): [number, number] {
  return [Math.floor(worldX / CELL_SIZE), Math.floor(worldZ / CELL_SIZE)];
}
