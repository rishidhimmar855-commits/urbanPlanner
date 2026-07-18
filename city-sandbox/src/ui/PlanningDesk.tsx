import { useEffect } from 'react';
import { useCityStore } from '../store/useCityStore';
import { CityScene } from '../rendering/CityScene';
import { Toolbar } from './Toolbar';
import { AmenityDock } from './AmenityDock';
import { SetupOverlay } from './SetupOverlay';
import { CreateProjectOverlay } from './CreateProjectOverlay';
import { PlansOverlay } from './PlansOverlay';
import { SectorPanel } from './SectorPanel';
import { ReportsPanel } from './ReportsPanel';
import { ExportPanel } from './ExportPanel';
import { LoadingScreen } from './LoadingScreen';
import { IconPin, IconCube, IconPlus } from './Icons';

function Toast() {
  const toast = useCityStore((s) => s.toast);
  const setToast = useCityStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return <div className="desk-toast" role="status">{toast}</div>;
}

function EmptyMapHero() {
  const setShowCreateProject = useCityStore((s) => s.setShowCreateProject);
  const brief = useCityStore((s) => s.brief);
  const showSetup = useCityStore((s) => s.showSetup);
  const showCreateProject = useCityStore((s) => s.showCreateProject);
  const showPlans = useCityStore((s) => s.showPlans);
  const isGenerating = useCityStore((s) => s.isGenerating);

  if (showSetup || showCreateProject || showPlans || isGenerating) {
    return <div className="empty-map-quiet" aria-hidden />;
  }

  return (
    <div className="empty-map-hero">
      <div className="empty-map-copy">
        <p className="eyebrow">Ready when you are</p>
        <h2>{brief.name?.trim() || 'New city map'}</h2>
        <p>Enter site coordinates to build land and open the 3D city in one step.</p>
        <ol className="empty-map-steps">
          <li>
            <IconPin size={14} /> Coordinates
          </li>
          <li>
            <IconCube size={14} /> Open 3D
          </li>
        </ol>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setShowCreateProject(true)}>
          <IconPlus size={18} />
          Create project
        </button>
      </div>
    </div>
  );
}

/** UI chrome around the 3D black box — do not edit CityScene internals here. */
export function PlanningDesk() {
  const hasCity = useCityStore((s) => !!s.grid);
  const isGenerating = useCityStore((s) => s.isGenerating);
  const activeView = useCityStore((s) => s.activeView);

  return (
    <div className="visualize-desk">
      <Toolbar />
      <div className="desk-stage">
        <div className="scene-container desk-scene">
          {hasCity ? <CityScene /> : <EmptyMapHero />}
        </div>
        {hasCity && <AmenityDock />}
        {hasCity && (
          <>
            <SectorPanel />
            {activeView === 'visualize' && <ReportsPanel mode="overlay" />}
            <ExportPanel />
          </>
        )}
        <CreateProjectOverlay />
        <SetupOverlay />
        <PlansOverlay />
        <LoadingScreen />
        <Toast />
        {isGenerating && <div className="desk-generating-veil" aria-hidden />}
      </div>
    </div>
  );
}
