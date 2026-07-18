import { useEffect, useMemo, useState } from 'react';
import { useCityStore } from '../store/useCityStore';
import {
  deleteSavedProject,
  ensureProjectPreview,
  listSavedProjects,
  loadProjectDraft,
} from '../utils/projectPersistence';
import { analyzeLandReadiness, suggestAmenitiesFromAdvice } from '../utils/landReadiness';
import { generateCity } from '../managers/ProjectManager';
import { CITY_TYPE_LABELS } from '../core/constants';
import { formatCurrency } from '../utils/budgetEstimate';
import type { SavedProjectMeta } from '../types';
import {
  IconCheck,
  IconCity,
  IconCube,
  IconDownload,
  IconFolder,
  IconPin,
  IconPlus,
  IconSpark,
  IconTrash,
  IconUsers,
  IconWallet,
  IconArrowRight,
} from './Icons';

export function OverviewDashboard() {
  const newProject = useCityStore((s) => s.newProject);
  const setActiveView = useCityStore((s) => s.setActiveView);
  const setBrief = useCityStore((s) => s.setBrief);
  const setAmenities = useCityStore((s) => s.setAmenities);
  const setTerrainGrid = useCityStore((s) => s.setTerrainGrid);
  const setLandReport = useCityStore((s) => s.setLandReport);
  const setProject = useCityStore((s) => s.setProject);
  const setShowSetup = useCityStore((s) => s.setShowSetup);
  const setShowCreateProject = useCityStore((s) => s.setShowCreateProject);
  const setGenerating = useCityStore((s) => s.setGenerating);
  const setGenerationProgress = useCityStore((s) => s.setGenerationProgress);
  const setPlanOptions = useCityStore((s) => s.setPlanOptions);
  const loadCity = useCityStore((s) => s.loadCity);
  const setToast = useCityStore((s) => s.setToast);
  const user = useCityStore((s) => s.user);
  const hasCity = useCityStore((s) => !!s.grid);
  const currentProject = useCityStore((s) => s.project);
  const [tick, setTick] = useState(0);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const projects = useMemo(() => listSavedProjects(), [tick]);
  const isEmpty = projects.length === 0;
  const showContinue = hasCity && !!currentProject;

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of projects) {
      const url = p.previewUrl || ensureProjectPreview(p.id);
      if (url) next[p.id] = url;
    }
    setPreviews(next);
  }, [projects]);

  const impact = useMemo(() => {
    const active = projects.filter((p) => p.status !== 'exported').length;
    const totalPop = projects.reduce((s, p) => s + p.expectedPopulation, 0);
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const ready = projects.filter(
      (p) => p.status === 'options_ready' || p.status === 'selected' || p.status === 'exported'
    ).length;
    return { active, totalPop, totalBudget, ready, total: projects.length };
  }, [projects]);

  const openProject = async (id: string) => {
    const draft = loadProjectDraft(id);
    if (!draft) return;

    const amenities = draft.amenities.length
      ? draft.amenities
      : suggestAmenitiesFromAdvice(
          analyzeLandReadiness(
            draft.terrainGrid,
            draft.brief.expectedPopulation,
            draft.brief.cityType
          ).amenityAdvice
        );
    const report = analyzeLandReadiness(
      draft.terrainGrid,
      draft.brief.expectedPopulation,
      draft.brief.cityType
    );

    setBrief(draft.brief);
    setAmenities(amenities);
    setTerrainGrid(draft.terrainGrid);
    setLandReport(report);
    setProject({
      id: draft.meta.id,
      name: draft.brief.name,
      createdAt: draft.meta.createdAt,
      gridWidth: draft.terrainGrid[0]?.length ?? 0,
      gridHeight: draft.terrainGrid.length,
      cellSize: 3,
      expectedPopulation: draft.brief.expectedPopulation,
      budget: draft.brief.budget,
      cityType: draft.brief.cityType,
      priorities: draft.brief.priorities,
      status: draft.meta.status,
    });
    setShowSetup(false);
    setShowCreateProject(false);
    setActiveView('visualize');
    setGenerating(true);
    setGenerationProgress({
      stage: 'terrain',
      progress: 0.05,
      message: `Opening ${draft.brief.name} in 3D…`,
    });

    try {
      const result = await generateCity(
        draft.terrainGrid,
        (p) => setGenerationProgress(p),
        {
          style: 'balanced',
          expectedPopulation: draft.brief.expectedPopulation,
          budget: draft.brief.budget,
          cityType: draft.brief.cityType,
          amenities,
        }
      );
      setPlanOptions([{ summary: result.summary, result }]);
      loadCity(result);
      setToast(`${draft.brief.name} ready on the 3D map`);
    } catch (e) {
      console.error(e);
      setGenerating(false);
      setToast(e instanceof Error ? e.message : 'Could not open project in 3D');
    }
  };

  const remove = (id: string) => {
    deleteSavedProject(id);
    setTick((t) => t + 1);
  };

  return (
    <div className="overview-page">
      <header className="overview-welcome overview-welcome-bar">
        <div>
          <p className="eyebrow">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</p>
          <h2>Mission desk</h2>
          <p className="muted">
            {isEmpty
              ? 'Start with site coordinates — UrbanVision builds the land and opens 3D.'
              : showContinue
                ? 'A city is loaded. Continue in 3D, download reports, or open another draft.'
                : 'Open a saved draft straight to 3D, or start a new project from coordinates.'}
          </p>
        </div>
        {!isEmpty && (
          <button type="button" className="btn btn-primary" onClick={newProject}>
            <IconPlus size={16} />
            New project
          </button>
        )}
      </header>

      {showContinue && (
        <section className="continue-banner continue-banner-primary" aria-label="Continue project">
          <div className="continue-banner-media" aria-hidden>
            {previews[currentProject!.id] ? (
              <img src={previews[currentProject!.id]} alt="" />
            ) : (
              <IconCube size={28} />
            )}
          </div>
          <div className="continue-banner-copy">
            <p className="eyebrow">In progress</p>
            <h3>{currentProject!.name}</h3>
            <p className="muted">Loaded on the 3D map — place amenities or export evidence.</p>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => setActiveView('visualize')}>
              <IconCube size={16} />
              Open 3D
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveView('reports')}>
              <IconDownload size={16} />
              Reports
            </button>
          </div>
        </section>
      )}

      {isEmpty ? (
        <section className="start-project-panel start-project-hero" aria-label="Start a new project">
          <div className="start-project-copy">
            <div className="start-project-badge">
              <IconSpark size={16} />
              First project
            </div>
            <h3>Create a city from coordinates</h3>
            <p>
              Name the project, drop lat/lng for the site, and open the 3D map — land is generated from
              those coordinates.
            </p>
            <ol className="start-steps">
              <li>
                <span className="start-step-icon">
                  <IconPin size={16} />
                </span>
                <div>
                  <strong>1 · Coordinates</strong>
                  <span>Name, lat/lng, site size</span>
                </div>
              </li>
              <li>
                <span className="start-step-icon">
                  <IconCube size={16} />
                </span>
                <div>
                  <strong>2 · Open 3D</strong>
                  <span>Terrain + city built from the site</span>
                </div>
              </li>
            </ol>
          </div>
          <div className="start-project-action">
            <button type="button" className="btn btn-primary btn-lg start-cta" onClick={newProject}>
              <IconPlus size={18} />
              Start project
              <IconArrowRight size={16} />
            </button>
            <p className="muted start-cta-hint">One form — then straight to the 3D workspace</p>
          </div>
        </section>
      ) : (
        <>
          <section className="impact-grid" aria-label="Impact summary">
            <article className="impact-card accent-card">
              <span className="impact-icon">
                <IconFolder size={18} />
              </span>
              <span className="impact-label">Projects</span>
              <strong className="impact-value">{impact.total}</strong>
              <span className="impact-meta">{impact.active} in progress</span>
            </article>
            <article className="impact-card">
              <span className="impact-icon">
                <IconUsers size={18} />
              </span>
              <span className="impact-label">Population planned</span>
              <strong className="impact-value">{(impact.totalPop / 1000).toFixed(0)}k</strong>
              <span className="impact-meta">Across saved drafts</span>
            </article>
            <article className="impact-card">
              <span className="impact-icon">
                <IconWallet size={18} />
              </span>
              <span className="impact-label">Budget envelope</span>
              <strong className="impact-value">{formatCurrency(impact.totalBudget)}</strong>
              <span className="impact-meta">Sum of project caps</span>
            </article>
            <article className="impact-card">
              <span className="impact-icon">
                <IconCheck size={18} />
              </span>
              <span className="impact-label">Plans ready</span>
              <strong className="impact-value">{impact.ready}</strong>
              <span className="impact-meta">Options or exported</span>
            </article>
          </section>

          <section className="project-list-section" aria-label="Recent projects">
            <div className="section-head">
              <h3>
                <IconCity size={18} /> Recent projects
              </h3>
              <p className="muted">Open jumps straight to 3D — no setup popup.</p>
            </div>
            <div className="project-card-grid">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  previewUrl={previews[p.id]}
                  onOpen={() => openProject(p.id)}
                  onRemove={() => remove(p.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function statusLabel(status: SavedProjectMeta['status']) {
  return status.replace(/_/g, ' ');
}

function ProjectCard({
  project,
  previewUrl,
  onOpen,
  onRemove,
}: {
  project: SavedProjectMeta;
  previewUrl?: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="project-card">
      <button
        type="button"
        className="project-card-media"
        onClick={onOpen}
        aria-label={`Open ${project.name}`}
      >
        {previewUrl ? (
          <img className="project-card-img" src={previewUrl} alt="" />
        ) : (
          <div className="project-card-fallback">
            <IconCube size={32} />
          </div>
        )}
        <span className={`project-card-status status-chip ${project.status}`}>
          {statusLabel(project.status)}
        </span>
      </button>
      <div className="project-card-body">
        <h4>{project.name}</h4>
        <p className="muted">
          {CITY_TYPE_LABELS[project.cityType] ?? project.cityType} ·{' '}
          {(project.expectedPopulation / 1000).toFixed(0)}k people
        </p>
        <p className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
        <div className="project-card-actions btn-row">
          <button type="button" className="btn btn-primary" onClick={onOpen}>
            Open
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onRemove}
            aria-label={`Delete ${project.name}`}
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
