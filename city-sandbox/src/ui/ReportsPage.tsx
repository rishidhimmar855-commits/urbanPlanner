import { useEffect, useMemo, useState } from 'react';
import { useCityStore, useCityStats, useSelectedPlanSummary } from '../store/useCityStore';
import {
  buildReportHtml,
  downloadReportHtml,
  type ProjectReportDoc,
} from '../utils/downloadReport';
import { formatCurrency } from '../utils/budgetEstimate';
import {
  ensureProjectPreview,
  listSavedProjects,
  loadProjectDraft,
  updateProjectStatus,
} from '../utils/projectPersistence';
import { analyzeLandReadiness } from '../utils/landReadiness';
import { CITY_TYPE_LABELS } from '../core/constants';
import type { SavedProjectMeta } from '../types';
import { IconCube, IconDownload, IconPlus, IconReports } from './Icons';

export function ReportsPage() {
  const setToast = useCityStore((s) => s.setToast);
  const newProject = useCityStore((s) => s.newProject);
  const user = useCityStore((s) => s.user);
  const project = useCityStore((s) => s.project);
  const brief = useCityStore((s) => s.brief);
  const reports = useCityStore((s) => s.reports);
  const landReport = useCityStore((s) => s.landReport);
  const sectors = useCityStore((s) => s.sectors);
  const buildings = useCityStore((s) => s.buildings);
  const roads = useCityStore((s) => s.roads);
  const hasCity = useCityStore((s) => !!s.grid);
  const plan = useSelectedPlanSummary();
  const stats = useCityStats();

  const [tick, setTick] = useState(0);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ meta: SavedProjectMeta; doc: ProjectReportDoc; html: string } | null>(
    null
  );

  const projects = useMemo(() => listSavedProjects(), [tick]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of projects) {
      const url = p.previewUrl || ensureProjectPreview(p.id);
      if (url) next[p.id] = url;
    }
    setPreviews(next);
  }, [projects]);

  const liveSnapshot = useMemo(
    () => ({
      sectors: sectors.length,
      buildings: buildings.length,
      roads: roads.length,
      population: stats?.population ?? plan?.populationCapacity ?? 0,
      happiness: stats?.happiness ?? plan?.happinessAvg ?? 0,
    }),
    [sectors.length, buildings.length, roads.length, stats, plan]
  );

  const buildDocForProject = (id: string): ProjectReportDoc | null => {
    const draft = loadProjectDraft(id);
    if (!draft) return null;

    const isLive = hasCity && project?.id === id;
    const land =
      isLive && landReport
        ? landReport
        : analyzeLandReadiness(
            draft.terrainGrid,
            draft.brief.expectedPopulation,
            draft.brief.cityType
          );

    return {
      brief: draft.brief,
      user,
      landReport: land,
      plan: isLive ? plan : null,
      snapshot: isLive
        ? liveSnapshot
        : {
            sectors: 0,
            buildings: 0,
            roads: 0,
            population: draft.brief.expectedPopulation,
            happiness: 0,
          },
      previewUrl: draft.meta.previewUrl || previews[id] || null,
      status: draft.meta.status,
      reports: isLive ? reports : undefined,
    };
  };

  const openReport = (meta: SavedProjectMeta) => {
    const doc = buildDocForProject(meta.id);
    if (!doc) {
      setToast('Could not load project report');
      return;
    }
    setViewer({ meta, doc, html: buildReportHtml(doc) });
  };

  const downloadProject = (meta: SavedProjectMeta) => {
    const doc = buildDocForProject(meta.id);
    if (!doc) {
      setToast('Could not download report');
      return;
    }
    downloadReportHtml(meta.name, doc);
    updateProjectStatus(meta.id, 'exported');
    setTick((t) => t + 1);
    setToast(`${meta.name} report downloaded`);
  };

  const downloadFromViewer = () => {
    if (!viewer) return;
    downloadReportHtml(viewer.meta.name, viewer.doc);
    updateProjectStatus(viewer.meta.id, 'exported');
    setTick((t) => t + 1);
    setToast('Report downloaded');
  };

  const printFromViewer = () => {
    if (!viewer) return;
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!w) {
      setToast('Allow popups to print the report');
      return;
    }
    w.document.write(viewer.html);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 300);
  };

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <p className="eyebrow">Evidence library</p>
          <h2>Project reports</h2>
          <p className="muted">
            Open a project to preview its planning report as a PDF-style document, or download it.
          </p>
        </div>
        {projects.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={newProject}>
            <IconPlus size={16} />
            New project
          </button>
        )}
      </section>

      {projects.length === 0 ? (
        <div className="empty-panel">
          <h4>No project reports yet</h4>
          <p>Create a project from coordinates — reports appear here with land previews.</p>
          <button type="button" className="btn btn-primary" onClick={newProject}>
            <IconPlus size={16} />
            Create project
          </button>
        </div>
      ) : (
        <section className="report-project-grid" aria-label="Project reports">
          {projects.map((p) => {
            const isLive = hasCity && project?.id === p.id;
            return (
              <article key={p.id} className={`report-project-card ${isLive ? 'live' : ''}`}>
                <button
                  type="button"
                  className="report-project-media"
                  onClick={() => openReport(p)}
                  aria-label={`View report for ${p.name}`}
                >
                  {previews[p.id] ? (
                    <img src={previews[p.id]} alt="" />
                  ) : (
                    <div className="report-project-fallback">
                      <IconCube size={28} />
                    </div>
                  )}
                  <span className={`status-chip ${p.status}`}>{p.status.replace(/_/g, ' ')}</span>
                </button>
                <div className="report-project-body">
                  <h3>{p.name}</h3>
                  <p className="muted">
                    {CITY_TYPE_LABELS[p.cityType] ?? p.cityType} · {(p.expectedPopulation / 1000).toFixed(0)}
                    k people
                  </p>
                  <p className="muted">{formatCurrency(p.budget)} budget</p>
                  {isLive && brief.timelineMonths != null && (
                    <p className="muted">{brief.timelineMonths}-month timeline · live on map</p>
                  )}
                  <div className="btn-row report-project-actions">
                    <button type="button" className="btn btn-primary" onClick={() => openReport(p)}>
                      <IconReports size={16} />
                      View report
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => downloadProject(p)}
                      aria-label={`Download report for ${p.name}`}
                    >
                      <IconDownload size={16} />
                      Download
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {viewer && (
        <div className="overlay-backdrop report-pdf-backdrop" onClick={() => setViewer(null)}>
          <div
            className="report-pdf-shell"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-pdf-title"
          >
            <div className="report-pdf-toolbar">
              <div>
                <p className="eyebrow">PDF preview</p>
                <h2 id="report-pdf-title">{viewer.meta.name}</h2>
              </div>
              <div className="btn-row">
                <button type="button" className="btn btn-secondary" onClick={printFromViewer}>
                  Print / Save PDF
                </button>
                <button type="button" className="btn btn-primary" onClick={downloadFromViewer}>
                  <IconDownload size={16} />
                  Download
                </button>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setViewer(null)}
                  aria-label="Close report"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="report-pdf-frame-wrap">
              <iframe
                className="report-pdf-frame"
                title={`${viewer.meta.name} report`}
                srcDoc={viewer.html}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
