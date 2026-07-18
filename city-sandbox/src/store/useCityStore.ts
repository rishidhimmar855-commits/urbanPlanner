import { create } from 'zustand';
import type {
  Sector,
  RoadSegment,
  Building,
  Vehicle,
  Pedestrian,
  TrafficLight,
  TreeInstance,
  RockInstance,
  AnalyticsReport,
  RenderMode,
  GenerationProgress,
  CityProject,
  SimulationData,
  CameraViewId,
  AmenityInstance,
  AmenityType,
} from '../types';
import type { GridEngine } from '../core/GridEngine';
import type { TerrainMeshData } from '../engines/TerrainEngine';
import type { SimulationEngine } from '../engines/SimulationEngine';
import type { TrafficEngine } from '../engines/TrafficEngine';
import type { PedestrianEngine } from '../engines/PedestrianEngine';
import type { RoadGenerator } from '../engines/RoadGenerator';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { CAMERA_VIEWS } from '../core/constants';

export interface GeoBaseData {
  /** Stitched satellite imagery used as ground texture */
  textureCanvas: HTMLCanvasElement;
  /** Height field in meters, heightsSize x heightsSize row-major (image top first) */
  heights: Float32Array;
  heightsSize: number;
  /** Ground plane size in world units (matches the generated city grid footprint) */
  widthUnits: number;
  depthUnits: number;
  /** Real-world meters represented by one world unit */
  metersPerUnit: number;
}

interface CityState {
  project: CityProject | null;
  /** Source terrain map (upload or rendered sample) for heatmap overlays / report previews */
  sourceMapDataUrl: string | null;
  /** Real-world satellite + elevation ground base (null for abstract terrains) */
  geoBase: GeoBaseData | null;
  generationStage: string;
  generationProgress: GenerationProgress | null;
  isGenerating: boolean;
  isSimulating: boolean;

  grid: GridEngine | null;
  terrainMesh: TerrainMeshData | null;
  sectors: Sector[];
  roads: RoadSegment[];
  buildings: Building[];
  amenities: AmenityInstance[];
  trees: TreeInstance[];
  rocks: RockInstance[];
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  trafficLights: TrafficLight[];
  reports: AnalyticsReport[];

  simulationEngine: SimulationEngine | null;
  trafficEngine: TrafficEngine | null;
  pedestrianEngine: PedestrianEngine | null;
  roadGenerator: RoadGenerator | null;

  selectedSectorId: number | null;
  renderMode: RenderMode;
  activeReport: AnalyticsReport | null;
  cameraTarget: [number, number, number];
  cameraPosition: [number, number, number];
  cameraView: CameraViewId;
  cameraViewNonce: number;
  terrainOnly: boolean;
  showReports: boolean;
  showSectorPanel: boolean;

  setProject: (project: CityProject) => void;
  setSourceMapDataUrl: (url: string | null) => void;
  setGeoBase: (geoBase: GeoBaseData | null) => void;
  setGenerationProgress: (progress: GenerationProgress) => void;
  setGenerating: (val: boolean) => void;
  loadCity: (data: {
    grid: GridEngine;
    terrainMesh: TerrainMeshData;
    sectors: Sector[];
    roads: RoadSegment[];
    buildings: Building[];
    vegetation: { trees: TreeInstance[]; rocks: RockInstance[] };
    vehicles: Vehicle[];
    trafficLights: TrafficLight[];
    pedestrians: Pedestrian[];
    reports: AnalyticsReport[];
    simulationEngine: SimulationEngine;
    trafficEngine: TrafficEngine;
    pedestrianEngine: PedestrianEngine;
    roadGenerator: RoadGenerator;
  }) => void;
  selectSector: (id: number | null) => void;
  /** Place an amenity on a free parcel cell inside the sector. Returns false when full. */
  addAmenity: (sectorId: number, type: AmenityType) => boolean;
  removeAmenity: (id: number) => void;
  setRenderMode: (mode: RenderMode) => void;
  setActiveReport: (report: AnalyticsReport | null) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setCameraView: (view: CameraViewId) => void;
  toggleTerrainOnly: () => void;
  toggleReports: () => void;
  toggleSectorPanel: () => void;
  setSimulating: (val: boolean) => void;
  updateSimulation: (deltaTime: number) => void;
  refreshReports: () => void;
  reset: () => void;
}

export const useCityStore = create<CityState>((set, get) => ({
  project: null,
  sourceMapDataUrl: null,
  geoBase: null,
  generationStage: 'idle',
  generationProgress: null,
  isGenerating: false,
  isSimulating: false,

  grid: null,
  terrainMesh: null,
  sectors: [],
  roads: [],
  buildings: [],
  amenities: [],
  trees: [],
  rocks: [],
  vehicles: [],
  pedestrians: [],
  trafficLights: [],
  reports: [],

  simulationEngine: null,
  trafficEngine: null,
  pedestrianEngine: null,
  roadGenerator: null,

  selectedSectorId: null,
  renderMode: 'overview' as RenderMode,
  activeReport: null,
  cameraTarget: [0, 0, 0],
  cameraPosition: [0, 80, 120],
  cameraView: 'perspective' as CameraViewId,
  cameraViewNonce: 0,
  terrainOnly: false,
  showReports: false,
  showSectorPanel: false,

  setProject: (project) => set({ project }),

  setSourceMapDataUrl: (url) => set({ sourceMapDataUrl: url }),

  setGeoBase: (geoBase) => set({ geoBase }),

  setGenerationProgress: (progress) =>
    set({ generationProgress: progress, generationStage: progress.stage }),

  setGenerating: (val) => set({ isGenerating: val }),

  loadCity: (data) =>
    set({
      grid: data.grid,
      terrainMesh: data.terrainMesh,
      sectors: data.sectors,
      roads: data.roads,
      buildings: data.buildings,
      amenities: [],
      trees: data.vegetation.trees,
      rocks: data.vegetation.rocks,
      vehicles: data.vehicles,
      trafficLights: data.trafficLights,
      pedestrians: data.pedestrians,
      reports: data.reports,
      simulationEngine: data.simulationEngine,
      trafficEngine: data.trafficEngine,
      pedestrianEngine: data.pedestrianEngine,
      roadGenerator: data.roadGenerator,
      isGenerating: false,
      isSimulating: true,
      generationStage: 'complete',
    }),

  selectSector: (id) => {
    const state = get();
    if (id !== null) {
      const sector = state.sectors.find((s) => s.id === id);
      if (sector && state.grid) {
        const cell = state.grid.getCell(Math.round(sector.center[0]), Math.round(sector.center[1]));
        if (cell) {
          set({
            selectedSectorId: id,
            cameraTarget: [cell.worldPosition.x, 0, cell.worldPosition.z],
            showSectorPanel: true,
            renderMode: 'detail' as RenderMode,
          });
          return;
        }
      }
    }
    set({ selectedSectorId: id, showSectorPanel: id !== null });
  },

  addAmenity: (sectorId, type) => {
    const state = get();
    const sector = state.sectors.find((s) => s.id === sectorId);
    if (!sector || !state.grid) return false;

    const grid = state.grid;
    const free = sector.cellIds
      .map((cid) => grid.getCellById(cid))
      .filter(
        (c): c is NonNullable<ReturnType<typeof grid.getCellById>> =>
          !!c && c.roadId === null && c.buildingId === null && c.amenityId === null
      );
    if (free.length === 0) return false;

    // Prefer road frontage like BuildingGenerator does
    const withFrontage = free.filter((c) =>
      grid.getNeighbors(c.gridX, c.gridY).some((n) => n.roadId !== null)
    );
    const pool = withFrontage.length > 0 ? withFrontage : free;
    const cell = pool[Math.floor(Math.random() * pool.length)];

    const nextId = state.amenities.reduce((m, a) => Math.max(m, a.id), -1) + 1;
    const amenity: AmenityInstance = {
      id: nextId,
      sectorId,
      cellId: cell.id,
      type,
      position: [cell.worldPosition.x, cell.elevation, cell.worldPosition.z],
      rotation: ((nextId % 4) * Math.PI) / 2,
    };
    cell.amenityId = amenity.id;

    sector.simulationData.happiness = Math.min(100, sector.simulationData.happiness + 2);

    set({ amenities: [...state.amenities, amenity] });
    return true;
  },

  removeAmenity: (id) => {
    const state = get();
    const amenity = state.amenities.find((a) => a.id === id);
    if (!amenity) return;

    const cell = state.grid?.getCellById(amenity.cellId);
    if (cell) cell.amenityId = null;

    const sector = state.sectors.find((s) => s.id === amenity.sectorId);
    if (sector) {
      sector.simulationData.happiness = Math.max(0, sector.simulationData.happiness - 2);
    }

    set({ amenities: state.amenities.filter((a) => a.id !== id) });
  },

  setRenderMode: (mode) => set({ renderMode: mode }),

  setActiveReport: (report) =>
    set((s) => ({
      activeReport: report,
      // Open the list when selecting; keep it open when clearing overlay
      showReports: report !== null ? true : s.showReports,
    })),

  setCameraTarget: (target) => set({ cameraTarget: target }),

  setCameraView: (view) => {
    const preset = CAMERA_VIEWS[view];
    if (!preset) return;
    set((s) => ({
      cameraView: view,
      cameraPosition: preset.position,
      cameraTarget: preset.target,
      cameraViewNonce: s.cameraViewNonce + 1,
    }));
  },

  toggleTerrainOnly: () =>
    set((s) => ({
      terrainOnly: !s.terrainOnly,
      isSimulating: s.terrainOnly ? s.isSimulating : false,
    })),

  toggleReports: () => set((s) => ({ showReports: !s.showReports })),

  toggleSectorPanel: () => set((s) => ({ showSectorPanel: !s.showSectorPanel })),

  setSimulating: (val) => set({ isSimulating: val }),

  updateSimulation: (deltaTime) => {
    const state = get();
    if (!state.isSimulating || state.terrainOnly || !state.simulationEngine) return;

    state.simulationEngine.update(state.sectors, deltaTime);
    state.trafficEngine?.update(state.roads, deltaTime);
    state.pedestrianEngine?.update(state.buildings, deltaTime);
    // Mutate in place — avoid React re-renders every frame
  },

  refreshReports: () => {
    const state = get();
    if (!state.grid) return;
    const engine = new AnalyticsEngine(state.grid);
    const reports = engine.generateAllReports(state.sectors, state.roads, state.buildings);
    set({ reports });
  },

  reset: () =>
    set({
      project: null,
      sourceMapDataUrl: null,
      geoBase: null,
      generationStage: 'idle',
      generationProgress: null,
      isGenerating: false,
      isSimulating: false,
      grid: null,
      terrainMesh: null,
      sectors: [],
      roads: [],
      buildings: [],
      amenities: [],
      trees: [],
      rocks: [],
      vehicles: [],
      pedestrians: [],
      trafficLights: [],
      reports: [],
      simulationEngine: null,
      trafficEngine: null,
      pedestrianEngine: null,
      roadGenerator: null,
      selectedSectorId: null,
      renderMode: 'overview' as RenderMode,
      activeReport: null,
      cameraTarget: [0, 0, 0],
      cameraPosition: [0, 80, 120],
      cameraView: 'perspective' as CameraViewId,
      cameraViewNonce: 0,
      terrainOnly: false,
      showReports: false,
      showSectorPanel: false,
    }),
}));

export function useSelectedSector(): Sector | null {
  const sectors = useCityStore((s) => s.sectors);
  const selectedId = useCityStore((s) => s.selectedSectorId);
  return sectors.find((s) => s.id === selectedId) ?? null;
}

export function useCityStats(): SimulationData | null {
  const simulationEngine = useCityStore((s) => s.simulationEngine);
  const sectors = useCityStore((s) => s.sectors);
  if (!simulationEngine || sectors.length === 0) return null;
  return simulationEngine.aggregateStats(sectors);
}
