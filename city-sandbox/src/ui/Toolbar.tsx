import { useCityStore, useCityStats } from '../store/useCityStore';
import { RenderMode, type CameraViewId } from '../types';
import { CAMERA_VIEWS } from '../core/constants';
import {
  IconExport,
  IconPause,
  IconPlans,
  IconPlay,
  IconRefresh,
  IconReports,
  IconSetup,
  IconTerrain,
} from './Icons';

const VIEW_IDS = Object.keys(CAMERA_VIEWS) as CameraViewId[];

export function Toolbar() {
  const project = useCityStore((s) => s.project);
  const renderMode = useCityStore((s) => s.renderMode);
  const isSimulating = useCityStore((s) => s.isSimulating);
  const terrainOnly = useCityStore((s) => s.terrainOnly);
  const cameraView = useCityStore((s) => s.cameraView);
  const hasCity = useCityStore((s) => !!s.grid);
  const planOptions = useCityStore((s) => s.planOptions);
  const setSimulating = useCityStore((s) => s.setSimulating);
  const toggleTerrainOnly = useCityStore((s) => s.toggleTerrainOnly);
  const setCameraView = useCityStore((s) => s.setCameraView);
  const setActiveView = useCityStore((s) => s.setActiveView);
  const toggleExport = useCityStore((s) => s.toggleExport);
  const toggleSetup = useCityStore((s) => s.toggleSetup);
  const togglePlans = useCityStore((s) => s.togglePlans);
  const refreshReports = useCityStore((s) => s.refreshReports);
  const stats = useCityStats();

  return (
    <div className="toolbar desk-toolbar" role="toolbar" aria-label="3D tools">
      <div className="toolbar-left">
        <h2 className="toolbar-title">{project?.name ?? 'Untitled project'}</h2>
        {hasCity && (
          <span className={`mode-badge ${terrainOnly ? 'terrain' : renderMode}`}>
            {terrainOnly ? 'Terrain' : renderMode === RenderMode.Overview ? 'Overview' : 'Detail'}
          </span>
        )}
      </div>

      <div className="toolbar-center">
        {hasCity && (
          <>
            <div className="view-switcher" role="group" aria-label="Camera views">
              {VIEW_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`view-btn ${cameraView === id ? 'active' : ''}`}
                  onClick={() => setCameraView(id)}
                  aria-pressed={cameraView === id}
                >
                  {CAMERA_VIEWS[id].label}
                </button>
              ))}
            </div>
            {!terrainOnly && stats && (
              <div className="stats-bar" aria-live="polite">
                <span>{stats.population.toLocaleString()} pop</span>
                <span>{stats.vehicles} veh</span>
                <span>{stats.happiness.toFixed(0)}% happy</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="toolbar-right">
        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleSetup}>
          <IconSetup size={14} />
          Setup
        </button>
        {planOptions.length > 0 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={togglePlans}>
            <IconPlans size={14} />
            Plans
          </button>
        )}
        {hasCity && (
          <>
            <button
              type="button"
              className={`btn btn-secondary btn-sm ${terrainOnly ? 'is-active' : ''}`}
              onClick={toggleTerrainOnly}
              aria-pressed={terrainOnly}
            >
              <IconTerrain size={14} />
              Terrain
            </button>
            <button
              type="button"
              className={`btn btn-secondary btn-sm ${isSimulating ? 'is-active' : ''}`}
              onClick={() => setSimulating(!isSimulating)}
              aria-pressed={isSimulating}
            >
              {isSimulating ? <IconPause size={14} /> : <IconPlay size={14} />}
              {isSimulating ? 'Pause' : 'Simulate'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveView('reports')}
            >
              <IconReports size={14} />
              Reports
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={refreshReports}>
              <IconRefresh size={14} />
              Refresh
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleExport}>
              <IconExport size={14} />
              Export
            </button>
          </>
        )}
      </div>
    </div>
  );
}
