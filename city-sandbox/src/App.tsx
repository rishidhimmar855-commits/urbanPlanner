import { useCityStore } from './store/useCityStore';
import { CityScene } from './rendering/CityScene';
import { ProjectSetup } from './ui/ProjectSetup';
import { Toolbar } from './ui/Toolbar';
import { SectorPanel } from './ui/SectorPanel';
import { ReportsPanel } from './ui/ReportsPanel';
import { ReportOverlay } from './ui/ReportOverlay';
import { LoadingScreen } from './ui/LoadingScreen';

export default function App() {
  const grid = useCityStore((s) => s.grid);
  const isGenerating = useCityStore((s) => s.isGenerating);
  const geoBase = useCityStore((s) => s.geoBase);

  if (!grid && !isGenerating) {
    return <ProjectSetup />;
  }

  return (
    <div className="app">
      <LoadingScreen />
      <Toolbar />
      <div className="scene-container">
        <CityScene />
        <ReportOverlay />
        {geoBase && (
          <div className="map-attribution">Imagery: Esri, Maxar, Earthstar Geographics</div>
        )}
      </div>
      <SectorPanel />
      <ReportsPanel />
    </div>
  );
}
