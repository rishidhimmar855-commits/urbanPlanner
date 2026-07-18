import { useState } from 'react';
import { useSelectedSector } from '../store/useCityStore';
import { useCityStore } from '../store/useCityStore';
import { AMENITY_CONFIG } from '../core/constants';
import { AmenityType } from '../types';

export function SectorPanel() {
  const sector = useSelectedSector();
  const showSectorPanel = useCityStore((s) => s.showSectorPanel);
  const selectSector = useCityStore((s) => s.selectSector);
  const buildings = useCityStore((s) => s.buildings);
  const amenities = useCityStore((s) => s.amenities);
  const addAmenity = useCityStore((s) => s.addAmenity);
  const removeAmenity = useCityStore((s) => s.removeAmenity);
  const grid = useCityStore((s) => s.grid);
  const [amenityHint, setAmenityHint] = useState<string | null>(null);

  if (!showSectorPanel || !sector) return null;

  const sectorBuildings = buildings.filter((b) => b.sectorId === sector.id);
  const sectorAmenities = amenities.filter((a) => a.sectorId === sector.id);
  const freeParcels = grid
    ? sector.cellIds.filter((id) => {
        const cell = grid.getCellById(id);
        return cell && cell.roadId === null && cell.buildingId === null && cell.amenityId === null;
      }).length
    : 0;
  const sim = sector.simulationData;

  const handleAdd = (type: AmenityType) => {
    const ok = addAmenity(sector.id, type);
    setAmenityHint(ok ? null : 'Sector is full — remove something first.');
  };

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

        <div className="panel-section">
          <h4>Amenities</h4>
          {sectorAmenities.length > 0 ? (
            <div className="amenity-chips">
              {sectorAmenities.map((amenity) => (
                <span key={amenity.id} className="amenity-chip">
                  <span
                    className="amenity-swatch"
                    style={{ background: AMENITY_CONFIG[amenity.type].color }}
                  />
                  {AMENITY_CONFIG[amenity.type].label}
                  <button
                    className="amenity-remove"
                    title="Remove amenity"
                    onClick={() => {
                      removeAmenity(amenity.id);
                      setAmenityHint(null);
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="amenity-empty">No amenities yet — add some below.</p>
          )}

          <div className="amenity-meta">
            <span>{freeParcels} free parcels</span>
          </div>

          <div className="amenity-add-grid">
            {Object.values(AmenityType).map((type) => (
              <button
                key={type}
                className="amenity-add-btn"
                disabled={freeParcels === 0}
                onClick={() => handleAdd(type)}
              >
                <span
                  className="amenity-swatch"
                  style={{ background: AMENITY_CONFIG[type].color }}
                />
                {AMENITY_CONFIG[type].label}
              </button>
            ))}
          </div>
          {amenityHint && <p className="amenity-hint">{amenityHint}</p>}
        </div>
      </div>
    </div>
  );
}
