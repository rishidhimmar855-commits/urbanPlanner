import type { Vector3 } from 'three';

export enum TerrainType {
  HighFertility = 'high_fertility',
  LowFertility = 'low_fertility',
  HighMinerals = 'high_minerals',
  Water = 'water',
  Forest = 'forest',
}

export enum SectorDensity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum RoadType {
  Primary = 'primary',
  Secondary = 'secondary',
  Pedestrian = 'pedestrian',
  Roundabout = 'roundabout',
  Intersection = 'intersection',
}

export enum BuildingType {
  House = 'house',
  Apartment = 'apartment',
  Tower = 'tower',
  Commercial = 'commercial',
}

export enum AmenityType {
  Park = 'park',
  School = 'school',
  Hospital = 'hospital',
  Market = 'market',
  Community = 'community',
  Sports = 'sports',
}

export interface AmenityInstance {
  id: number;
  sectorId: number;
  cellId: number;
  type: AmenityType;
  position: [number, number, number];
  rotation: number;
}

export enum RenderMode {
  Overview = 'overview',
  Detail = 'detail',
}

export type CameraViewId = 'perspective' | 'isometric' | 'top' | 'side';

export enum ReportType {
  Population = 'population',
  Traffic = 'traffic',
  RoadUsage = 'road_usage',
  Pollution = 'pollution',
  WaterUsage = 'water_usage',
  Electricity = 'electricity',
  ForestCoverage = 'forest_coverage',
  LandUsage = 'land_usage',
  BuildingDensity = 'building_density',
  SectorComparison = 'sector_comparison',
  GrowthTrends = 'growth_trends',
}

export interface SimulationData {
  population: number;
  employment: number;
  vehicles: number;
  pollution: number;
  traffic: number;
  electricity: number;
  waterUsage: number;
  waste: number;
  happiness: number;
  averageIncome: number;
}

export interface CellData {
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
  sectorId: number | null;
  districtId: number | null;
  roadId: number | null;
  buildingId: number | null;
  amenityId: number | null;
  simulationData: Partial<SimulationData>;
}

export interface Sector {
  id: number;
  name: string;
  /** Macro-grid column / row index in the planned city */
  gridCol: number;
  gridRow: number;
  /** Inclusive interior bounds (buildable parcels, not arterial cells) */
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  cellIds: number[];
  boundary: [number, number][];
  center: [number, number];
  area: number;
  density: SectorDensity;
  color: string;
  simulationData: SimulationData;
}

export interface RoadSegment {
  id: number;
  type: RoadType;
  cellIds: number[];
  start: [number, number];
  end: [number, number];
  width: number;
  connectedSectorIds: number[];
  hasTrafficLight: boolean;
}

export interface Building {
  id: number;
  sectorId: number;
  cellId: number;
  type: BuildingType;
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  color: string;
  roofColor: string;
  population: number;
}

export interface TreeInstance {
  position: [number, number, number];
  scale: number;
  rotation: number;
}

export interface RockInstance {
  position: [number, number, number];
  scale: number;
}

export interface Vehicle {
  id: number;
  roadId: number;
  position: [number, number, number];
  rotation: number;
  speed: number;
  progress: number;
  color: string;
}

export interface Pedestrian {
  id: number;
  position: [number, number, number];
  targetBuildingId: number;
  sourceBuildingId: number;
  progress: number;
  speed: number;
}

export interface TrafficLight {
  id: number;
  position: [number, number, number];
  roadId: number;
  state: 'red' | 'green' | 'yellow';
  timer: number;
}

export interface CityProject {
  id: string;
  name: string;
  createdAt: number;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  /** Real-world location metadata when the land base is fetched from satellite tiles */
  geo?: {
    centerLat: number;
    centerLng: number;
    areaKm: number;
    zoom: number;
  };
}

export interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface AnalyticsReport {
  type: ReportType;
  title: string;
  data: Record<string, unknown>;
  heatmap?: Float32Array;
  heatmapWidth?: number;
  heatmapHeight?: number;
}

export interface ChunkData {
  sectorId: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  buildingIds: number[];
  loaded: boolean;
  detailLevel: number;
}

export type GenerationStage =
  | 'idle'
  | 'parsing'
  | 'terrain'
  | 'sectors'
  | 'roads'
  | 'buildings'
  | 'vegetation'
  | 'water'
  | 'population'
  | 'traffic'
  | 'pedestrians'
  | 'complete';
