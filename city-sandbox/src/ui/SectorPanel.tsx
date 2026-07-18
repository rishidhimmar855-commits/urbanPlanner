import { useSelectedSector } from '../store/useCityStore';
import { useCityStore } from '../store/useCityStore';

export function SectorPanel() {
  const sector = useSelectedSector();
  const showSectorPanel = useCityStore((s) => s.showSectorPanel);
  const selectSector = useCityStore((s) => s.selectSector);
  const buildings = useCityStore((s) => s.buildings);

  if (!showSectorPanel || !sector) return null;

  const sectorBuildings = buildings.filter((b) => b.sectorId === sector.id);
  const sim = sector.simulationData;

  return (
    <div className="sector-panel">
      <div className="panel-header">
        <h3>{sector.name}</h3>
        <button className="close-btn" onClick={() => selectSector(null)}>✕</button>
      </div>

      <div className="panel-body">
        <div className="stat-grid">
          <div className="stat-item">
            <label>Grid</label>
            <span>
              Col {sector.gridCol + 1}, Row {sector.gridRow + 1}
            </span>
          </div>
          <div className="stat-item">
            <label>Density</label>
            <span className={`density-badge ${sector.density}`}>{sector.density}</span>
          </div>
          <div className="stat-item">
            <label>Area</label>
            <span>{sector.area} cells</span>
          </div>
          <div className="stat-item">
            <label>Buildings</label>
            <span>{sectorBuildings.length}</span>
          </div>
          <div className="stat-item">
            <label>Population</label>
            <span>{sim.population.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <label>Employment</label>
            <span>{sim.employment.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <label>Vehicles</label>
            <span>{sim.vehicles}</span>
          </div>
          <div className="stat-item">
            <label>Traffic</label>
            <span>{sim.traffic.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <label>Pollution</label>
            <span>{sim.pollution.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <label>Happiness</label>
            <span>{sim.happiness.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <label>Income</label>
            <span>${sim.averageIncome.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <label>Electricity</label>
            <span>{Math.round(sim.electricity).toLocaleString()} kWh</span>
          </div>
          <div className="stat-item">
            <label>Water</label>
            <span>{Math.round(sim.waterUsage).toLocaleString()} L</span>
          </div>
        </div>

        <div className="panel-section">
          <h4>Building Types</h4>
          <div className="building-types">
            {Object.entries(
              sectorBuildings.reduce(
                (acc, b) => {
                  acc[b.type] = (acc[b.type] ?? 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )
            ).map(([type, count]) => (
              <span key={type} className="building-tag">
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
