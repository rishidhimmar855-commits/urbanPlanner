import { GridEngine } from '../core/GridEngine';
import { TerrainEngine } from '../engines/TerrainEngine';
import { SectorGenerator } from '../engines/SectorGenerator';
import { RoadGenerator, DEFAULT_ROAD_LAYOUT, type RoadLayoutOptions } from '../engines/RoadGenerator';
import { BuildingGenerator } from '../engines/BuildingGenerator';
import { VegetationGenerator } from '../engines/VegetationGenerator';
import { SimulationEngine } from '../engines/SimulationEngine';
import { TrafficEngine } from '../engines/TrafficEngine';
import { PedestrianEngine } from '../engines/PedestrianEngine';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import type { TerrainType, GenerationProgress, Sector } from '../types';
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
}

export async function generateCity(
  terrainGrid: TerrainType[][],
  onProgress?: (progress: GenerationProgress) => void,
  roadLayout: RoadLayoutOptions = DEFAULT_ROAD_LAYOUT
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

  report('sectors', 0.3, 'Planning city sectors...');
  const sectorGenerator = new SectorGenerator(grid);
  const plan = sectorGenerator.generate();
  const sectors = plan.sectors;

  report('roads', 0.45, 'Building arterial & sector roads...');
  const roadGenerator = new RoadGenerator(grid);
  const roads = roadGenerator.generate(plan, roadLayout);

  report('buildings', 0.6, 'Placing buildings...');
  const buildingGenerator = new BuildingGenerator(grid);
  const buildings = buildingGenerator.generate(sectors);

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
  };
}
