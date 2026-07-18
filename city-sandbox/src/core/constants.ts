import {
  TerrainType,
  SectorDensity,
  RoadType,
  BuildingType,
  type AmenityType,
  type PlanStyle,
  type CityType,
} from '../types';

export const CELL_SIZE = 3;
export const MAX_GRID_SIZE = 64;
export const SAMPLE_GRID_SIZE = 48;

/** Gandhinagar-style planned sector grid (cells). */
export const SECTOR_PLAN = {
  /** Interior parcel size (between arterial roads) */
  sectorSize: 7,
  /** Width of arterial corridor between sectors */
  arterialWidth: 1,
  /** Minimum buildable cells required to keep a sector */
  minCells: 12,
  /** Secondary road spacing inside a sector */
  internalBlock: 3,
};

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.HighFertility]: '#4CAF50',
  [TerrainType.LowFertility]: '#C8B896',
  [TerrainType.HighMinerals]: '#795548',
  [TerrainType.Water]: '#2196F3',
  [TerrainType.Forest]: '#1B5E20',
};

export const TERRAIN_REFERENCE_RGB: Record<TerrainType, [number, number, number]> = {
  [TerrainType.HighFertility]: [76, 175, 80],
  [TerrainType.LowFertility]: [200, 184, 150],
  [TerrainType.HighMinerals]: [121, 85, 72],
  [TerrainType.Water]: [33, 150, 243],
  [TerrainType.Forest]: [27, 94, 32],
};

export const TERRAIN_ELEVATION: Record<TerrainType, number> = {
  [TerrainType.Water]: 0,
  [TerrainType.LowFertility]: 1.5,
  [TerrainType.HighFertility]: 3,
  [TerrainType.Forest]: 5,
  [TerrainType.HighMinerals]: 8,
};

export const TERRAIN_PROPERTIES: Record<
  TerrainType,
  { fertility: number; mineralDensity: number; waterDepth: number; forestDensity: number }
> = {
  [TerrainType.HighFertility]: { fertility: 0.9, mineralDensity: 0.1, waterDepth: 0, forestDensity: 0.2 },
  [TerrainType.LowFertility]: { fertility: 0.3, mineralDensity: 0.2, waterDepth: 0, forestDensity: 0.05 },
  [TerrainType.HighMinerals]: { fertility: 0.05, mineralDensity: 0.95, waterDepth: 0, forestDensity: 0 },
  [TerrainType.Water]: { fertility: 0, mineralDensity: 0, waterDepth: 1, forestDensity: 0 },
  [TerrainType.Forest]: { fertility: 0.4, mineralDensity: 0.05, waterDepth: 0, forestDensity: 0.85 },
};

export const SECTOR_DENSITY_CONFIG: Record<
  SectorDensity,
  {
    buildingCount: [number, number];
    /** Height in multiples of CELL_SIZE */
    heightRange: [number, number];
    populationRange: [number, number];
    /** Road width as fraction of CELL_SIZE */
    roadWidth: number;
    vehicleCount: [number, number];
    pedestrianCount: [number, number];
    /** Block size in cells between secondary roads */
    blockSize: number;
    color: string;
  }
> = {
  [SectorDensity.Low]: {
    buildingCount: [3, 6],
    heightRange: [0.9, 1.4],
    populationRange: [40, 120],
    roadWidth: 0.85,
    vehicleCount: [1, 2],
    pedestrianCount: [2, 5],
    blockSize: 4,
    color: '#81C784',
  },
  [SectorDensity.Medium]: {
    buildingCount: [5, 10],
    heightRange: [1.6, 3.2],
    populationRange: [120, 350],
    roadWidth: 0.9,
    vehicleCount: [2, 4],
    pedestrianCount: [4, 10],
    blockSize: 3,
    color: '#FFB74D',
  },
  [SectorDensity.High]: {
    buildingCount: [8, 14],
    heightRange: [3.5, 7],
    populationRange: [350, 1000],
    roadWidth: 0.95,
    vehicleCount: [3, 6],
    pedestrianCount: [6, 14],
    blockSize: 3,
    color: '#E57373',
  },
};

/** Road tile fills nearly one cell; width is unused for tiling but kept for type hierarchy. */
export const ROAD_CONFIG: Record<RoadType, { width: number; color: string; height: number }> = {
  [RoadType.Primary]: { width: 1, color: '#37474F', height: 0.1 },
  [RoadType.Secondary]: { width: 0.92, color: '#546E7A', height: 0.08 },
  [RoadType.Pedestrian]: { width: 0.55, color: '#90A4AE', height: 0.06 },
  [RoadType.Roundabout]: { width: 1, color: '#37474F', height: 0.1 },
  [RoadType.Intersection]: { width: 1, color: '#455A64', height: 0.1 },
};

/**
 * Footprint as fraction of CELL_SIZE so buildings fit inside a single parcel cell.
 * Houses leave a small yard margin; towers fill most of the lot.
 */
export const BUILDING_CONFIG: Record<
  BuildingType,
  { footprint: [number, number]; colors: string[]; roofColors: string[] }
> = {
  [BuildingType.House]: {
    footprint: [0.55, 0.75],
    colors: ['#EFEBE9', '#D7CCC8', '#BCAAA4', '#FFE0B2'],
    roofColors: ['#5D4037', '#4E342E', '#6D4C41'],
  },
  [BuildingType.Apartment]: {
    footprint: [0.7, 0.88],
    colors: ['#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE'],
    roofColors: ['#37474F', '#455A64'],
  },
  [BuildingType.Tower]: {
    footprint: [0.65, 0.85],
    colors: ['#263238', '#37474F', '#455A64', '#546E7A'],
    roofColors: ['#212121', '#263238'],
  },
  [BuildingType.Commercial]: {
    footprint: [0.75, 0.9],
    colors: ['#1565C0', '#1976D2', '#1E88E5', '#42A5F5'],
    roofColors: ['#0D47A1', '#1565C0'],
  },
  [BuildingType.Hospital]: {
    footprint: [0.8, 0.95],
    colors: ['#E53935', '#EF5350', '#FFCDD2'],
    roofColors: ['#B71C1C', '#C62828'],
  },
  [BuildingType.School]: {
    footprint: [0.75, 0.9],
    colors: ['#FB8C00', '#FFA726', '#FFE0B2'],
    roofColors: ['#E65100', '#EF6C00'],
  },
  [BuildingType.BusStand]: {
    footprint: [0.7, 0.85],
    colors: ['#00897B', '#26A69A', '#80CBC4'],
    roofColors: ['#004D40', '#00695C'],
  },
  [BuildingType.Railway]: {
    footprint: [0.85, 0.98],
    colors: ['#5E35B1', '#7E57C2', '#B39DDB'],
    roofColors: ['#311B92', '#4527A0'],
  },
  [BuildingType.Park]: {
    footprint: [0.6, 0.85],
    colors: ['#43A047', '#66BB6A', '#A5D6A7'],
    roofColors: ['#2E7D32', '#388E3C'],
  },
  [BuildingType.Market]: {
    footprint: [0.7, 0.9],
    colors: ['#F9A825', '#FBC02D', '#FFF59D'],
    roofColors: ['#F57F17', '#F9A825'],
  },
};

export const AMENITY_META: Record<
  AmenityType,
  {
    label: string;
    buildingType: BuildingType;
    unitCost: number;
    popPerUnit: number;
    image: string;
    blurb: string;
  }
> = {
  hospital: {
    label: 'Hospital',
    buildingType: BuildingType.Hospital,
    unitCost: 45_000_000,
    popPerUnit: 25_000,
    image: '/amenities/hospital.svg',
    blurb: 'Emergency & public health campus',
  },
  school: {
    label: 'School',
    buildingType: BuildingType.School,
    unitCost: 8_000_000,
    popPerUnit: 5_000,
    image: '/amenities/school.svg',
    blurb: 'Neighborhood education block',
  },
  bus_stand: {
    label: 'Bus Stand',
    buildingType: BuildingType.BusStand,
    unitCost: 12_000_000,
    popPerUnit: 20_000,
    image: '/amenities/bus_stand.svg',
    blurb: 'City bus terminal hub',
  },
  railway: {
    label: 'Railway Station',
    buildingType: BuildingType.Railway,
    unitCost: 80_000_000,
    popPerUnit: 80_000,
    image: '/amenities/railway.svg',
    blurb: 'Regional rail interchange',
  },
  park: {
    label: 'Park',
    buildingType: BuildingType.Park,
    unitCost: 2_500_000,
    popPerUnit: 8_000,
    image: '/amenities/park.svg',
    blurb: 'Green public open space',
  },
  market: {
    label: 'Market',
    buildingType: BuildingType.Market,
    unitCost: 6_000_000,
    popPerUnit: 10_000,
    image: '/amenities/market.svg',
    blurb: 'Local commerce & food market',
  },
};

export const PLAN_STYLE_META: Record<
  PlanStyle,
  { label: string; description: string; densityBias: number; buildingScale: number; amenityScale: number; costScale: number }
> = {
  budget: {
    label: 'Budget Plan',
    description: 'Phased, lower density, essential amenities only — lowest upfront cost.',
    densityBias: -1,
    buildingScale: 0.7,
    amenityScale: 0.75,
    costScale: 0.85,
  },
  balanced: {
    label: 'Balanced Plan',
    description: 'Gandhinagar-style mix of densities with full amenity coverage within budget.',
    densityBias: 0,
    buildingScale: 1,
    amenityScale: 1,
    costScale: 1,
  },
  growth: {
    label: 'Growth Plan',
    description: 'Higher capacity core, stronger transit, long-term expansion — higher cost.',
    densityBias: 1,
    buildingScale: 1.35,
    amenityScale: 1.25,
    costScale: 1.2,
  },
};

export const CITY_TYPE_LABELS: Record<CityType, string> = {
  mixed: 'Mixed-use',
  residential: 'Residential',
  industrial: 'Industrial / Jobs',
  green: 'Green / Eco',
  transit: 'Transit-oriented',
};

export const COST_PER_ROAD = 450_000;
export const COST_PER_HOUSE = 2_500_000;
export const COST_PER_APARTMENT = 8_000_000;
export const COST_PER_TOWER = 25_000_000;
export const COST_PER_COMMERCIAL = 12_000_000;
export const COST_LAND_PREP_PER_CELL = 80_000;

export const DENSITY_TO_BUILDING: Record<SectorDensity, BuildingType> = {
  [SectorDensity.Low]: BuildingType.House,
  [SectorDensity.Medium]: BuildingType.Apartment,
  [SectorDensity.High]: BuildingType.Tower,
};

export const LOD_DISTANCES = {
  overview: 120,
  detail: 40,
  buildings: 60,
  traffic: 50,
  vegetation: 70,
};

export const CAMERA_CONFIG = {
  minDistance: 10,
  maxDistance: 500,
  defaultPosition: [0, 80, 120] as [number, number, number],
  defaultTarget: [0, 0, 0] as [number, number, number],
};

export const CAMERA_VIEWS: Record<
  string,
  { label: string; position: [number, number, number]; target: [number, number, number] }
> = {
  perspective: {
    label: 'Perspective',
    position: [0, 80, 120],
    target: [0, 0, 0],
  },
  isometric: {
    label: 'Isometric',
    position: [90, 90, 90],
    target: [0, 0, 0],
  },
  top: {
    label: 'Top-Down',
    position: [0, 180, 0.1],
    target: [0, 0, 0],
  },
  side: {
    label: 'Side',
    position: [0, 40, 160],
    target: [0, 0, 0],
  },
};

export const SIMULATION_TICK_MS = 100;
export const TRAFFIC_LIGHT_CYCLE = 8;

export const CHUNK_SIZE = 32;

export const DEFAULT_SIMULATION: import('../types').SimulationData = {
  population: 0,
  employment: 0,
  vehicles: 0,
  pollution: 0,
  traffic: 0,
  electricity: 0,
  waterUsage: 0,
  waste: 0,
  happiness: 50,
  averageIncome: 0,
};
