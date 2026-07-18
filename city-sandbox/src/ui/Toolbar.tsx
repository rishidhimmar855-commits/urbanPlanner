import { useCityStore, useCityStats } from '../store/useCityStore';
import { RenderMode, type CameraViewId } from '../types';
import { CAMERA_VIEWS } from '../core/constants';

const VIEW_IDS = Object.keys(CAMERA_VIEWS) as CameraViewId[];

export function Toolbar() {
  const project = useCityStore((s) => s.project);
  const renderMode = useCityStore((s) => s.renderMode);
  const isSimulating = useCityStore((s) => s.isSimulating);
  const terrainOnly = useCityStore((s) => s.terrainOnly);
  const cameraView = useCityStore((s) => s.cameraView);
  const setSimulating = useCityStore((s) => s.setSimulating);
  const toggleTerrainOnly = useCityStore((s) => s.toggleTerrainOnly);
  const setCameraView = useCityStore((s) => s.setCameraView);
  const toggleReports = useCityStore((s) => s.toggleReports);
  const refreshReports = useCityStore((s) => s.refreshReports);
  const reset = useCityStore((s) => s.reset);
  const stats = useCityStats();

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h2>{project?.name ?? 'City Sandbox'}</h2>
        <span className={`mode-badge ${terrainOnly ? 'terrain' : renderMode}`}>
          {terrainOnly ? 'Terrain' : renderMode === RenderMode.Overview ? 'Overview' : 'Detail'}
        </span>
      </div>

      <div className="toolbar-center">
        <div className="view-switcher">
          {VIEW_IDS.map((id) => (
            <button
              key={id}
              className={`view-btn ${cameraView === id ? 'active' : ''}`}
              onClick={() => setCameraView(id)}
              title={CAMERA_VIEWS[id].label}
            >
              {CAMERA_VIEWS[id].label}
            </button>
          ))}
        </div>
        {!terrainOnly && stats && (
          <div className="stats-bar">
            <span>{stats.population.toLocaleString()} pop</span>
            <span>{stats.vehicles} veh</span>
            <span>{stats.happiness.toFixed(0)}% happy</span>
          </div>
        )}
      </div>

      <div className="toolbar-right">
        <button
          className={`tool-btn ${terrainOnly ? 'active' : ''}`}
          onClick={toggleTerrainOnly}
          title="Show only terrain + water"
        >
          Terrain Only
        </button>
        {!terrainOnly && (
          <button
            className={`tool-btn ${isSimulating ? 'active' : ''}`}
            onClick={() => setSimulating(!isSimulating)}
          >
            {isSimulating ? 'Pause' : 'Simulate'}
          </button>
        )}
        <button className="tool-btn" onClick={toggleReports}>
          Reports
        </button>
        <button className="tool-btn" onClick={refreshReports}>
          Refresh
        </button>
        <button className="tool-btn danger" onClick={reset}>
          New
        </button>
      </div>
    </div>
  );
}
