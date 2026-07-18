import type {
  AmenityRequest,
  CityType,
  GovUser,
  ProjectBrief,
  ProjectStatus,
  SavedProjectMeta,
  TerrainType,
} from '../types';
import { terrainGridToDataUrl } from './landClassify';

const USER_KEY = 'city-sandbox-gov-user';
const PROJECTS_KEY = 'city-sandbox-saved-projects';
const TERRAIN_PREFIX = 'city-sandbox-terrain-';

export interface PersistedProject {
  meta: SavedProjectMeta;
  brief: ProjectBrief;
  amenities: AmenityRequest[];
  terrainGrid: TerrainType[][];
  selectedPlanStyle?: string;
}

export function loadUser(): GovUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as GovUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: GovUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function listSavedProjects(): SavedProjectMeta[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    const list = raw ? (JSON.parse(raw) as SavedProjectMeta[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeMetaList(list: SavedProjectMeta[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function saveProjectDraft(project: PersistedProject): void {
  const previewUrl =
    project.meta.previewUrl ||
    (typeof document !== 'undefined' ? terrainGridToDataUrl(project.terrainGrid, 3) : undefined);

  const meta: SavedProjectMeta = {
    ...project.meta,
    previewUrl: previewUrl || undefined,
    updatedAt: Date.now(),
  };

  const list = listSavedProjects().filter((p) => p.id !== meta.id);
  list.unshift(meta);
  writeMetaList(list);
  localStorage.setItem(
    TERRAIN_PREFIX + meta.id,
    JSON.stringify({
      brief: project.brief,
      amenities: project.amenities,
      terrainGrid: project.terrainGrid,
      selectedPlanStyle: project.selectedPlanStyle,
    })
  );
}

/** Ensure older drafts get a land thumbnail for the overview cards. */
export function ensureProjectPreview(id: string): string | null {
  const list = listSavedProjects();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  if (list[idx].previewUrl) return list[idx].previewUrl!;

  const draft = loadProjectDraft(id);
  if (!draft?.terrainGrid?.length || typeof document === 'undefined') return null;

  const previewUrl = terrainGridToDataUrl(draft.terrainGrid, 3);
  if (!previewUrl) return null;
  list[idx] = { ...list[idx], previewUrl };
  writeMetaList(list);
  return previewUrl;
}

export function loadProjectDraft(id: string): PersistedProject | null {
  const meta = listSavedProjects().find((p) => p.id === id);
  if (!meta) return null;
  try {
    const raw = localStorage.getItem(TERRAIN_PREFIX + id);
    if (!raw) return null;
    const data = JSON.parse(raw) as Omit<PersistedProject, 'meta'>;
    return { meta, ...data };
  } catch {
    return null;
  }
}

export function updateProjectStatus(id: string, status: ProjectStatus): void {
  const list = listSavedProjects();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], status, updatedAt: Date.now() };
  writeMetaList(list);
}

export function deleteSavedProject(id: string): void {
  writeMetaList(listSavedProjects().filter((p) => p.id !== id));
  localStorage.removeItem(TERRAIN_PREFIX + id);
}

export function createDefaultBrief(): ProjectBrief {
  return {
    name: 'New Smart City',
    expectedPopulation: 50000,
    budget: 500_000_000,
    cityType: 'mixed' as CityType,
    priorities: ['Housing', 'Transit'],
    timelineMonths: 36,
    latitude: 23.2156,
    longitude: 72.6369,
    siteSizeKm: 4,
  };
}
