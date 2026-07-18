import { AMENITY_META } from '../core/constants';
import { useCityStore } from '../store/useCityStore';
import type { AmenityType } from '../types';
import { formatCurrency } from '../utils/budgetEstimate';

const TYPES = Object.keys(AMENITY_META) as AmenityType[];

export function AmenityDock() {
  const hasCity = useCityStore((s) => !!s.grid);
  const active = useCityStore((s) => s.activeAmenityTool);
  const setTool = useCityStore((s) => s.setActiveAmenityTool);
  const placeAmenity = useCityStore((s) => s.placeAmenity);
  const amenities = useCityStore((s) => s.amenities);
  const landReport = useCityStore((s) => s.landReport);
  const showAmenityDock = useCityStore((s) => s.showAmenityDock);

  if (!showAmenityDock) return null;

  const advice = new Map(landReport?.amenityAdvice.map((a) => [a.type, a]) ?? []);
  const countOf = (t: AmenityType) => amenities.find((a) => a.type === t)?.count ?? 0;

  return (
    <aside className="amenity-dock">
      <div className="amenity-dock-head">
        <h3>Amenities</h3>
        <p>Select, then click a sector on the map — or tap Add.</p>
      </div>

      <div className="amenity-dock-list">
        {TYPES.map((type) => {
          const meta = AMENITY_META[type];
          const tip = advice.get(type);
          const selected = active === type;
          return (
            <button
              key={type}
              type="button"
              className={`amenity-card ${selected ? 'active' : ''} ${tip?.suitability ?? ''}`}
              onClick={() => setTool(selected ? null : type)}
            >
              <img src={meta.image} alt={meta.label} className="amenity-card-img" />
              <div className="amenity-card-body">
                <div className="amenity-card-title">
                  <strong>{meta.label}</strong>
                  {tip && <span className={`suit-pill ${tip.suitability}`}>{tip.suitability}</span>}
                </div>
                <span className="amenity-blurb">{meta.blurb}</span>
                <span className="amenity-meta">
                  {formatCurrency(meta.unitCost)} · placed {countOf(type)}
                </span>
              </div>
              <span
                className="amenity-add-btn"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasCity) return;
                  setTool(type);
                  placeAmenity(type);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    setTool(type);
                    placeAmenity(type);
                  }
                }}
              >
                Add
              </span>
            </button>
          );
        })}
      </div>

      {!hasCity && (
        <p className="amenity-dock-hint">Create or load a city plan to place amenities on the 3D map.</p>
      )}
      {hasCity && active && (
        <p className="amenity-dock-hint active-tool">
          Tool: <strong>{AMENITY_META[active].label}</strong> — click a sector to place
        </p>
      )}
    </aside>
  );
}
