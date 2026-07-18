import { v4 as uuidv4 } from 'uuid';
import { GridEngine } from '../core/GridEngine';
import { TerrainEngine } from '../engines/TerrainEngine';
import { SectorGenerator } from '../engines/SectorGenerator';
import { RoadGenerator } from '../engines/RoadGenerator';
import { BuildingGenerator } from '../engines/BuildingGenerator';
import { VegetationGenerator } from '../engines/VegetationGenerator';
import { SimulationEngine } from '../engines/SimulationEngine';
import { TrafficEngine } from '../engines/TrafficEngine';
import { PedestrianEngine } from '../engines/PedestrianEngine';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { PLAN_STYLE_META } from '../core/constants';
import { estimateBudget } from '../utils/budgetEstimate';
import {
  TerrainType,
  type GenerationProgress,
  type Sector,
  type GenerationConfig,
  type PlanStyle,
  type PlanOptionSummary,
  type AmenityRequest,
} from '../types';
import type { TerrainMeshData } from '../engines/TerrainEngine';

export interface CityGenerationResult {
  grid: GridEngine;
  terrainMesh: TerrainMeshData;
  sectors: Sector[];
  roads: ReturnType<RoadGenerator['generate']>;
  buildings: ReturnType<BuildingGenerator['generate']>;
  vegetation: ReturnType<VegetationGenerator['generate']>;
  vehicles: ReturnType<TrafficEngine['generate']>['vehicles'];
  trafficLights: ReturnType<TrafficEngine['generate']>['trafficLights'];
  pedestrians: ReturnType<PedestrianEngine['generate']>;
  reports: ReturnType<AnalyticsEngine['generateAllReports']>;
  simulationEngine: SimulationEngine;
  trafficEngine: TrafficEngine;
  pedestrianEngine: PedestrianEngine;
  roadGenerator: RoadGenerator;
  summary: PlanOptionSummary;
}

export interface PlanOptionBundle {
  summary: PlanOptionSummary;
  result: CityGenerationResult;
}

const DEFAULT_CONFIG: GenerationConfig = {
  style: 'balanced',
  expectedPopulation: 50000,
  budget: 500_000_000,
  cityType: 'mixed',
  amenities: [],
};

export async function generateCity(
  terrainGrid: TerrainType[][],
  onProgress?: (progress: GenerationProgress) => void,
  config: GenerationConfig = DEFAULT_CONFIG
): Promise<CityGenerationResult> {
  const report = (stage: string, progress: number, message: string) => {
    onProgress?.({ stage, progress, message });
  };

  report('terrain', 0.05, 'Initializing grid...');
  const grid = new GridEngine();
  grid.initialize(terrainGrid);

  report('terrain', 0.15, 'Generating terrain mesh...');
  const terrainEngine = new TerrainEngine(grid);
  terrainEngine.smoothElevations(2);
  const terrainMesh = terrainEngine.generateMesh();

  report('sectors', 0.3, `Planning ${config.style} city sectors...`);
  const sectorGenerator = new SectorGenerator(grid, config.style);
  const plan = sectorGenerator.generate();
  const sectors = plan.sectors;

  report('roads', 0.45, 'Building arterial & sector roads...');
  const roadGenerator = new RoadGenerator(grid);
  const roads = roadGenerator.generate(plan);

  report('buildings', 0.6, 'Placing buildings & amenities...');
  const buildingGenerator = new BuildingGenerator(grid);
  const buildings = buildingGenerator.generate(sectors, config);

  report('vegetation', 0.7, 'Growing vegetation...');
  const vegetationGenerator = new VegetationGenerator(grid);
  const vegetation = vegetationGenerator.generate();

  report('population', 0.8, 'Initializing simulation...');
  const simulationEngine = new SimulationEngine();
  simulationEngine.initializeSectors(sectors);

  report('traffic', 0.85, 'Generating traffic...');
  const trafficEngine = new TrafficEngine(roadGenerator);
  const { vehicles, trafficLights } = trafficEngine.generate(roads);

  report('pedestrians', 0.9, 'Spawning pedestrians...');
  const pedestrianEngine = new PedestrianEngine();
  const pedestrians = pedestrianEngine.generate(buildings, roads, sectors);

  report('complete', 0.95, 'Generating analytics...');
  const analyticsEngine = new AnalyticsEngine(grid);
  const reports = analyticsEngine.generateAllReports(sectors, roads, buildings);

  const landPrepCells = countLandPrepCells(terrainGrid);
  const estimatedBudget = estimateBudget(
    roads,
    buildings,
    config.amenities,
    landPrepCells,
    config.style
  );
  const populationCapacity = sectors.reduce((s, sec) => s + sec.simulationData.population, 0);
  const amenityCount = countAmenities(buildings);
  const happinessAvg =
    sectors.length > 0
      ? sectors.reduce((s, sec) => s + sec.simulationData.happiness, 0) / sectors.length
      : 50;

  const meta = PLAN_STYLE_META[config.style];
  const withinBudget = estimatedBudget.total <= config.budget;
  const popScore = Math.max(
    0,
    100 - Math.abs(populationCapacity - config.expectedPopulation) / Math.max(config.expectedPopulation, 1) * 100
  );
  const budgetScore = withinBudget
    ? 100 - (estimatedBudget.total / Math.max(config.budget, 1)) * 30
    : Math.max(0, 40 - ((estimatedBudget.total - config.budget) / Math.max(config.budget, 1)) * 40);
  const score = Math.round(popScore * 0.45 + budgetScore * 0.35 + happinessAvg * 0.2);

  const summary: PlanOptionSummary = {
    id: uuidv4(),
    style: config.style,
    label: meta.label,
    description: meta.description,
    estimatedBudget,
    populationCapacity,
    sectorCount: sectors.length,
    buildingCount: buildings.length,
    amenityCount,
    roadCount: roads.length,
    happinessAvg: Math.round(happinessAvg * 10) / 10,
    withinBudget,
    score,
  };

  report('complete', 1, 'City generation complete!');

  return {
    grid,
    terrainMesh,
    sectors,
    roads,
    buildings,
    vegetation,
    vehicles,
    trafficLights,
    pedestrians,
    reports,
    simulationEngine,
    trafficEngine,
    pedestrianEngine,
    roadGenerator,
    summary,
  };
}

/** Generate Budget + Balanced (+ Growth if population large) concepts. */
export async function generatePlanOptions(
  terrainGrid: TerrainType[][],
  baseConfig: Omit<GenerationConfig, 'style'>,
  onProgress?: (progress: GenerationProgress) => void
): Promise<PlanOptionBundle[]> {
  const styles: PlanStyle[] =
    baseConfig.expectedPopulation >= 40000
      ? ['budget', 'balanced', 'growth']
      : ['budget', 'balanced'];

  const bundles: PlanOptionBundle[] = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    const amenities = scaleAmenitiesForStyle(baseConfig.amenities, style);
    const wrapProgress = (p: GenerationProgress) => {
      const slice = 1 / styles.length;
      onProgress?.({
        stage: p.stage,
        progress: i * slice + p.progress * slice,
        message: `${PLAN_STYLE_META[style].label}: ${p.message}`,
      });
    };

    // Yield so the loading UI can paint between plan concepts
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const result = await generateCity(
      terrainGrid,
      wrapProgress,
      { ...baseConfig, style, amenities }
    );
    bundles.push({ summary: result.summary, result });
  }

  return bundles;
}

function scaleAmenitiesForStyle(
  amenities: AmenityRequest[],
  style: PlanStyle
): AmenityRequest[] {
  const scale = PLAN_STYLE_META[style].amenityScale;
  return amenities.map((a) => {
    if (style === 'budget' && a.type === 'railway') {
      return { ...a, count: 0 };
    }
    return {
      ...a,
      count: Math.max(0, Math.round(a.count * scale)),
    };
  });
}

function countLandPrepCells(terrainGrid: TerrainType[][]): number {
  let n = 0;
  for (const row of terrainGrid) {
    for (const cell of row) {
      if (cell === TerrainType.Forest || cell === TerrainType.HighMinerals) n++;
    }
  }
  return n;
}

function countAmenities(buildings: ReturnType<BuildingGenerator['generate']>): number {
  const amenityTypes = new Set([
    'hospital',
    'school',
    'bus_stand',
    'railway',
    'park',
    'market',
  ]);
  return buildings.filter((b) => amenityTypes.has(b.type)).length;
}
