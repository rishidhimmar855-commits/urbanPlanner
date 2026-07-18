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
  Hospital = 'hospital',
  School = 'school',
  BusStand = 'bus_stand',
  Railway = 'railway',
  Park = 'park',
  Market = 'market',
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

export type AppStep = 'login' | 'workspace';

export type AppView = 'overview' | 'visualize' | 'reports';

export type CityType = 'mixed' | 'residential' | 'industrial' | 'green' | 'transit';

export type PlanStyle = 'budget' | 'balanced' | 'growth';

export type AmenityType =
  | 'hospital'
  | 'school'
  | 'bus_stand'
  | 'railway'
  | 'park'
  | 'market';

export type Suitability = 'ready' | 'caution' | 'unsuitable';

export type ProjectStatus = 'draft' | 'planning' | 'options_ready' | 'selected' | 'exported';

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

export interface AmenityRequest {
  type: AmenityType;
  count: number;
  label: string;
}

export interface AmenitySuitability {
  type: AmenityType;
  label: string;
  suitability: Suitability;
  reason: string;
  recommendedCount: number;
}

export interface ProjectBrief {
  name: string;
  expectedPopulation: number;
  budget: number;
  cityType: CityType;
  priorities: string[];
  /** Planned delivery timeline in months */
  timelineMonths?: number;
  /** Site latitude (WGS84) when created from coordinates */
  latitude?: number;
  /** Site longitude (WGS84) when created from coordinates */
  longitude?: number;
  /** Approximate site extent in km */
  siteSizeKm?: number;
}

export interface LandReadinessReport {
  totalCells: number;
  buildablePercent: number;
  fertilePercent: number;
  forestPercent: number;
  waterPercent: number;
  mineralPercent: number;
  overallScore: number;
  summary: string;
  terrainCounts: Record<TerrainType, number>;
  amenityAdvice: AmenitySuitability[];
}

export interface BudgetBreakdown {
  roads: number;
  buildings: number;
  amenities: number;
  landPrep: number;
  total: number;
}

export interface PlanOptionSummary {
  id: string;
  style: PlanStyle;
  label: string;
  description: string;
  estimatedBudget: BudgetBreakdown;
  populationCapacity: number;
  sectorCount: number;
  buildingCount: number;
  amenityCount: number;
  roadCount: number;
  happinessAvg: number;
  withinBudget: boolean;
  score: number;
}

export interface GovUser {
  id: string;
  name: string;
  email: string;
  role: 'planner' | 'reviewer' | 'admin';
  department: string;
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  status: ProjectStatus;
  cityType: CityType;
  expectedPopulation: number;
  budget: number;
  createdAt: number;
  updatedAt: number;
  /** Classified land thumbnail (data URL) when available */
  previewUrl?: string;
}

export interface CityProject {
  id: string;
  name: string;
  createdAt: number;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  expectedPopulation?: number;
  budget?: number;
  cityType?: CityType;
  priorities?: string[];
  status?: ProjectStatus;
}

export interface GenerationConfig {
  style: PlanStyle;
  expectedPopulation: number;
  budget: number;
  cityType: CityType;
  amenities: AmenityRequest[];
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
