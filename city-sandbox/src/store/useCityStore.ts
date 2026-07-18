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
  AppStep,
  AppView,
  GovUser,
  ProjectBrief,
  AmenityRequest,
  LandReadinessReport,
  PlanOptionSummary,
  TerrainType,
  AmenityType,
} from '../types';
import { BuildingType } from '../types';
import type { GridEngine } from '../core/GridEngine';
import type { TerrainMeshData } from '../engines/TerrainEngine';
import type { SimulationEngine } from '../engines/SimulationEngine';
import type { TrafficEngine } from '../engines/TrafficEngine';
import type { PedestrianEngine } from '../engines/PedestrianEngine';
import type { RoadGenerator } from '../engines/RoadGenerator';
import type { CityGenerationResult, PlanOptionBundle } from '../managers/ProjectManager';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine';
import { AMENITY_META, BUILDING_CONFIG, CAMERA_VIEWS, CELL_SIZE } from '../core/constants';
import { loadUser, clearUser, createDefaultBrief } from '../utils/projectPersistence';

interface CityState {
  step: AppStep;
  activeView: AppView;
  user: GovUser | null;
  brief: ProjectBrief;
  amenities: AmenityRequest[];
  terrainGrid: TerrainType[][] | null;
  landReport: LandReadinessReport | null;
  planOptions: PlanOptionBundle[];
  selectedPlanId: string | null;

  showSetup: boolean;
  showCreateProject: boolean;
  showPlans: boolean;
  showAmenityDock: boolean;
  activeAmenityTool: AmenityType | null;
  lastPlacedAmenityId: number | null;
  toast: string | null;

  project: CityProject | null;
  generationStage: string;
  generationProgress: GenerationProgress | null;
  isGenerating: boolean;
  isSimulating: boolean;

  grid: GridEngine | null;
  terrainMesh: TerrainMeshData | null;
  sectors: Sector[];
  roads: RoadSegment[];
  buildings: Building[];
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
  showExport: boolean;

  setStep: (step: AppStep) => void;
  setActiveView: (view: AppView) => void;
  login: (user: GovUser) => void;
  logout: () => void;
  setBrief: (brief: ProjectBrief) => void;
  setAmenities: (amenities: AmenityRequest[]) => void;
  setTerrainGrid: (grid: TerrainType[][] | null) => void;
  setLandReport: (report: LandReadinessReport | null) => void;
  setPlanOptions: (options: PlanOptionBundle[]) => void;
  setSelectedPlanId: (id: string | null) => void;
  setProject: (project: CityProject) => void;
  setGenerationProgress: (progress: GenerationProgress) => void;
  setGenerating: (val: boolean) => void;
  loadCity: (data: CityGenerationResult) => void;
  selectSector: (id: number | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setActiveReport: (report: AnalyticsReport | null) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  setCameraView: (view: CameraViewId) => void;
  toggleTerrainOnly: () => void;
  toggleReports: () => void;
  toggleSectorPanel: () => void;
  toggleExport: () => void;
  toggleSetup: () => void;
  togglePlans: () => void;
  setShowSetup: (v: boolean) => void;
  setShowCreateProject: (v: boolean) => void;
  setShowPlans: (v: boolean) => void;
  setActiveAmenityTool: (type: AmenityType | null) => void;
  placeAmenity: (type: AmenityType, sectorId?: number | null) => boolean;
  setToast: (msg: string | null) => void;
  setSimulating: (val: boolean) => void;
  updateSimulation: (deltaTime: number) => void;
  refreshReports: () => void;
  resetCity: () => void;
  newProject: () => void;
}

const initialUser = typeof window !== 'undefined' ? loadUser() : null;

export const useCityStore = create<CityState>((set, get) => ({
  step: initialUser ? 'workspace' : 'login',
  activeView: 'overview',
  user: initialUser,
  brief: createDefaultBrief(),
  amenities: [],
  terrainGrid: null,
  landReport: null,
  planOptions: [],
  selectedPlanId: null,

  showSetup: false,
  showCreateProject: false,
  showPlans: false,
  showAmenityDock: true,
  activeAmenityTool: null,
  lastPlacedAmenityId: null,
  toast: null,

  project: null,
  generationStage: 'idle',
  generationProgress: null,
  isGenerating: false,
  isSimulating: false,

  grid: null,
  terrainMesh: null,
  sectors: [],
  roads: [],
  buildings: [],
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
  showExport: false,

  setStep: (step) => set({ step }),

  setActiveView: (view) =>
    set((s) => ({
      activeView: view,
      showReports: view === 'reports' ? true : s.showReports,
      showSetup: view === 'visualize' ? s.showSetup : false,
      showCreateProject: view === 'visualize' ? s.showCreateProject : false,
      showPlans: view === 'visualize' ? s.showPlans : false,
    })),

  login: (user) =>
    set({
      user,
      step: 'workspace',
      activeView: 'overview',
      showSetup: false,
      showCreateProject: false,
    }),

  logout: () => {
    clearUser();
    set({
      user: null,
      step: 'login',
      activeView: 'overview',
      brief: createDefaultBrief(),
      amenities: [],
      terrainGrid: null,
      landReport: null,
      planOptions: [],
      selectedPlanId: null,
      project: null,
      grid: null,
      terrainMesh: null,
      sectors: [],
      roads: [],
      buildings: [],
      trees: [],
      rocks: [],
      vehicles: [],
      pedestrians: [],
      trafficLights: [],
      reports: [],
      isGenerating: false,
      isSimulating: false,
      showExport: false,
      showSetup: false,
      showCreateProject: false,
      showPlans: false,
      showReports: false,
      activeAmenityTool: null,
    });
  },

  setBrief: (brief) => set({ brief }),
  setAmenities: (amenities) => set({ amenities }),
  setTerrainGrid: (terrainGrid) => set({ terrainGrid }),
  setLandReport: (landReport) => set({ landReport }),
  setPlanOptions: (planOptions) => set({ planOptions }),
  setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
  setProject: (project) => set({ project }),

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
      step: 'workspace',
      activeView: 'visualize',
      selectedPlanId: data.summary.id,
      showSetup: false,
      showCreateProject: false,
      showPlans: false,
      showAmenityDock: true,
      toast: `${data.summary.label} loaded — add amenities from the dock`,
    }),

  selectSector: (id) => {
    const state = get();
    const tool = state.activeAmenityTool;

    if (id !== null && tool && state.grid) {
      const ok = get().placeAmenity(tool, id);
      if (ok) return;
    }

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

  setRenderMode: (mode) => set({ renderMode: mode }),
  setActiveReport: (report) => set({ activeReport: report, showReports: report !== null }),
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

  toggleReports: () => set((s) => ({ showReports: !s.showReports, showExport: false, showPlans: false })),
  toggleSectorPanel: () => set((s) => ({ showSectorPanel: !s.showSectorPanel })),
  toggleExport: () => set((s) => ({ showExport: !s.showExport, showReports: false, showPlans: false })),
  toggleSetup: () => set((s) => ({ showSetup: !s.showSetup, showPlans: false, showCreateProject: false })),
  togglePlans: () =>
    set((s) => ({ showPlans: !s.showPlans, showSetup: false, showCreateProject: false, showReports: false })),
  setShowSetup: (v) => set(v ? { showSetup: true, showCreateProject: false } : { showSetup: false }),
  setShowCreateProject: (v) =>
    set(v ? { showCreateProject: true, showSetup: false, showPlans: false } : { showCreateProject: false }),
  setShowPlans: (v) => set({ showPlans: v }),
  setActiveAmenityTool: (type) => set({ activeAmenityTool: type }),
  setToast: (toast) => set({ toast }),

  placeAmenity: (type, sectorId) => {
    const state = get();
    if (!state.grid || state.sectors.length === 0) {
      set({ toast: 'Generate a city first, then place amenities on sectors.' });
      return false;
    }

    const meta = AMENITY_META[type];
    const bConfig = BUILDING_CONFIG[meta.buildingType];
    const targetId = sectorId ?? state.selectedSectorId;
    const sector =
      (targetId != null ? state.sectors.find((s) => s.id === targetId) : null) ??
      state.sectors[Math.floor(Math.random() * state.sectors.length)];

    const parcels = sector.cellIds
      .map((id) => state.grid!.getCellById(id))
      .filter((c) => c && c.roadId === null && c.buildingId === null);

    if (parcels.length === 0) {
      set({ toast: `No free parcel in ${sector.name} for ${meta.label}.` });
      return false;
    }

    const withFrontage = parcels.filter((c) =>
      state.grid!.getNeighbors(c!.gridX, c!.gridY).some((n) => n.roadId !== null)
    );
    const preferFront = type === 'bus_stand' || type === 'railway' || type === 'market';
    const pool = preferFront && withFrontage.length > 0 ? withFrontage : parcels;
    const cell = pool[Math.floor(Math.random() * pool.length)]!;

    const footprint =
      bConfig.footprint[0] + Math.random() * (bConfig.footprint[1] - bConfig.footprint[0]);
    const heightMult =
      meta.buildingType === BuildingType.Park
        ? 0.35
        : meta.buildingType === BuildingType.Hospital
          ? 2.8
          : meta.buildingType === BuildingType.Railway
            ? 2.2
            : 1.6;

    const nextId =
      state.buildings.reduce((m, b) => Math.max(m, b.id), 0) + 1;

    const building: Building = {
      id: nextId,
      sectorId: sector.id,
      cellId: cell.id,
      type: meta.buildingType,
      position: [cell.worldPosition.x, cell.elevation, cell.worldPosition.z],
      width: CELL_SIZE * footprint,
      height: CELL_SIZE * heightMult,
      depth: CELL_SIZE * footprint * 0.9,
      color: bConfig.colors[0],
      roofColor: bConfig.roofColors[0],
      population: 0,
    };

    cell.buildingId = building.id;
    sector.simulationData.happiness = Math.min(98, sector.simulationData.happiness + 2);

    const amenities = [...state.amenities];
    const existing = amenities.find((a) => a.type === type);
    if (existing) existing.count += 1;
    else amenities.push({ type, label: meta.label, count: 1 });

    set({
      buildings: [...state.buildings, building],
      amenities: [...amenities],
      lastPlacedAmenityId: building.id,
      selectedSectorId: sector.id,
      showSectorPanel: true,
      toast: `${meta.label} placed in ${sector.name}`,
      activeAmenityTool: type,
    });
    return true;
  },

  setSimulating: (val) => set({ isSimulating: val }),

  updateSimulation: (deltaTime) => {
    const state = get();
    if (!state.isSimulating || state.terrainOnly || !state.simulationEngine) return;
    state.simulationEngine.update(state.sectors, deltaTime);
    state.trafficEngine?.update(state.roads, deltaTime);
    state.pedestrianEngine?.update(state.buildings, deltaTime);
  },

  refreshReports: () => {
    const state = get();
    if (!state.grid) return;
    const engine = new AnalyticsEngine(state.grid);
    const reports = engine.generateAllReports(state.sectors, state.roads, state.buildings);
    set({ reports });
  },

  resetCity: () =>
    set({
      project: null,
      generationStage: 'idle',
      generationProgress: null,
      isGenerating: false,
      isSimulating: false,
      grid: null,
      terrainMesh: null,
      sectors: [],
      roads: [],
      buildings: [],
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
      showExport: false,
      planOptions: [],
      selectedPlanId: null,
      activeAmenityTool: null,
    }),

  newProject: () => {
    get().resetCity();
    set({
      brief: createDefaultBrief(),
      amenities: [],
      terrainGrid: null,
      landReport: null,
      showSetup: false,
      showCreateProject: true,
      showPlans: false,
      showReports: false,
      step: 'workspace',
      activeView: 'visualize',
    });
  },
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

export function useSelectedPlanSummary(): PlanOptionSummary | null {
  const options = useCityStore((s) => s.planOptions);
  const id = useCityStore((s) => s.selectedPlanId);
  return options.find((o) => o.summary.id === id)?.summary ?? null;
}
