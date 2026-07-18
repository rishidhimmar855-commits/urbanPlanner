import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCityStore } from '../store/useCityStore';
import { createTerrainFromCoords } from '../utils/colorDetection';
import { analyzeLandReadiness, suggestAmenitiesFromAdvice } from '../utils/landReadiness';
import { generateCity } from '../managers/ProjectManager';
import { saveProjectDraft } from '../utils/projectPersistence';
import { terrainGridToDataUrl } from '../utils/landClassify';
import { formatCurrency } from '../utils/budgetEstimate';
import { IconPin, IconSpark, IconArrowRight } from './Icons';

const PRESETS = [
  { label: 'Gandhinagar', lat: 23.2156, lng: 72.6369 },
  { label: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { label: 'Surat', lat: 21.1702, lng: 72.8311 },
];

const TIMELINE_OPTIONS = [
  { value: 12, label: '12 months' },
  { value: 24, label: '24 months' },
  { value: 36, label: '36 months' },
  { value: 48, label: '48 months' },
  { value: 60, label: '60 months' },
];

export function CreateProjectOverlay() {
  const show = useCityStore((s) => s.showCreateProject);
  const setShowCreateProject = useCityStore((s) => s.setShowCreateProject);
  const brief = useCityStore((s) => s.brief);
  const setBrief = useCityStore((s) => s.setBrief);
  const setAmenities = useCityStore((s) => s.setAmenities);
  const setTerrainGrid = useCityStore((s) => s.setTerrainGrid);
  const setLandReport = useCityStore((s) => s.setLandReport);
  const setProject = useCityStore((s) => s.setProject);
  const setGenerating = useCityStore((s) => s.setGenerating);
  const setGenerationProgress = useCityStore((s) => s.setGenerationProgress);
  const setPlanOptions = useCityStore((s) => s.setPlanOptions);
  const loadCity = useCityStore((s) => s.loadCity);
  const setToast = useCityStore((s) => s.setToast);
  const hasCity = useCityStore((s) => !!s.grid);

  const [name, setName] = useState(brief.name || 'New Smart City');
  const [lat, setLat] = useState(String(brief.latitude ?? 23.2156));
  const [lng, setLng] = useState(String(brief.longitude ?? 72.6369));
  const [sizeKm, setSizeKm] = useState(String(brief.siteSizeKm ?? 4));
  const [population, setPopulation] = useState(String(brief.expectedPopulation || 50000));
  const [timelineMonths, setTimelineMonths] = useState(String(brief.timelineMonths ?? 36));
  const [budget, setBudget] = useState(String(brief.budget || 500_000_000));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    setName(brief.name || 'New Smart City');
    setLat(String(brief.latitude ?? 23.2156));
    setLng(String(brief.longitude ?? 72.6369));
    setSizeKm(String(brief.siteSizeKm ?? 4));
    setPopulation(String(brief.expectedPopulation || 50000));
    setTimelineMonths(String(brief.timelineMonths ?? 36));
    setBudget(String(brief.budget || 500_000_000));
    setError(null);
  }, [
    show,
    brief.name,
    brief.latitude,
    brief.longitude,
    brief.siteSizeKm,
    brief.expectedPopulation,
    brief.timelineMonths,
    brief.budget,
  ]);

  if (!show) return null;

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setLat(String(p.lat));
    setLng(String(p.lng));
    if (!name.trim() || name === 'New Smart City') setName(`${p.label} Township`);
  };

  const create = async () => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const siteSizeKm = Number(sizeKm);
    const expectedPopulation = Number(population);
    const timeline = Number(timelineMonths);
    const budgetValue = Number(budget);

    if (!name.trim()) {
      setError('Enter a project name.');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }
    if (!Number.isFinite(siteSizeKm) || siteSizeKm < 1 || siteSizeKm > 20) {
      setError('Site size should be 1–20 km.');
      return;
    }
    if (!Number.isFinite(expectedPopulation) || expectedPopulation < 1000) {
      setError('Population aiming should be at least 1,000.');
      return;
    }
    if (!Number.isFinite(timeline) || timeline < 6 || timeline > 120) {
      setError('Timeline should be between 6 and 120 months.');
      return;
    }
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
      setError('Enter a valid project budget.');
      return;
    }

    setError(null);
    const nextBrief = {
      ...brief,
      name: name.trim(),
      latitude,
      longitude,
      siteSizeKm,
      expectedPopulation,
      timelineMonths: timeline,
      budget: budgetValue,
    };
    setBrief(nextBrief);

    const grid = createTerrainFromCoords(latitude, longitude, siteSizeKm);
    const report = analyzeLandReadiness(grid, nextBrief.expectedPopulation, nextBrief.cityType);
    const amenities = suggestAmenitiesFromAdvice(report.amenityAdvice);
    const id = uuidv4();

    setTerrainGrid(grid);
    setLandReport(report);
    setAmenities(amenities);
    setProject({
      id,
      name: nextBrief.name,
      createdAt: Date.now(),
      gridWidth: grid[0]?.length ?? 0,
      gridHeight: grid.length,
      cellSize: 3,
      expectedPopulation: nextBrief.expectedPopulation,
      budget: nextBrief.budget,
      cityType: nextBrief.cityType,
      priorities: nextBrief.priorities,
      status: 'planning',
    });
    saveProjectDraft({
      meta: {
        id,
        name: nextBrief.name,
        status: 'planning',
        cityType: nextBrief.cityType,
        expectedPopulation: nextBrief.expectedPopulation,
        budget: nextBrief.budget,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        previewUrl: terrainGridToDataUrl(grid),
      },
      brief: nextBrief,
      amenities,
      terrainGrid: grid,
    });

    setShowCreateProject(false);
    setGenerating(true);
    setGenerationProgress({
      stage: 'terrain',
      progress: 0.05,
      message: `Building 3D city at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}…`,
    });

    try {
      const result = await generateCity(
        grid,
        (p) => setGenerationProgress(p),
        {
          style: 'balanced',
          expectedPopulation: nextBrief.expectedPopulation,
          budget: nextBrief.budget,
          cityType: nextBrief.cityType,
          amenities,
        }
      );
      setPlanOptions([{ summary: result.summary, result }]);
      loadCity(result);
      setToast(`${nextBrief.name} ready on the 3D map`);
    } catch (e) {
      console.error(e);
      setGenerating(false);
      setShowCreateProject(true);
      setToast(e instanceof Error ? e.message : 'Could not build city from coordinates');
    }
  };

  const budgetNum = Number(budget);

  return (
    <div
      className="overlay-backdrop"
      onClick={() => hasCity && setShowCreateProject(false)}
    >
      <div
        className="overlay-panel create-project-overlay"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        <div className="overlay-header">
          <div>
            <p className="eyebrow">
              <IconPin size={12} /> New project
            </p>
            <h2 id="create-project-title">Create from coordinates</h2>
            <p className="setup-subtitle">
              Set goals and site lat/lng — UrbanVision builds land and opens 3D directly.
            </p>
          </div>
          {hasCity && (
            <button
              type="button"
              className="close-btn"
              onClick={() => setShowCreateProject(false)}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        <div className="overlay-body">
          <div className="form-stack">
            <label className="field">
              <span>Project name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Green Corridor Township"
              />
            </label>

            <div className="form-row-2">
              <label className="field">
                <span>Population aiming</span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                />
                <span className="field-hint">Target residents for density planning</span>
              </label>
              <label className="field">
                <span>Project timeline</span>
                <select value={timelineMonths} onChange={(e) => setTimelineMonths(e.target.value)}>
                  {TIMELINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">Delivery horizon for phasing</span>
              </label>
            </div>

            <label className="field">
              <span>Budget (₹)</span>
              <input
                type="number"
                min={1}
                step={1_000_000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <span className="field-hint">
                {Number.isFinite(budgetNum) && budgetNum > 0
                  ? `${formatCurrency(budgetNum)} envelope`
                  : 'Enter total project budget'}
              </span>
            </label>

            <div className="form-row-2">
              <label className="field">
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="23.2156"
                />
              </label>
              <label className="field">
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="72.6369"
                />
              </label>
            </div>

            <label className="field">
              <span>Site size (km)</span>
              <input
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={sizeKm}
                onChange={(e) => setSizeKm(e.target.value)}
              />
              <span className="field-hint">Larger sites use a denser planning grid (max 64×64)</span>
            </label>

            <div className="coord-presets" role="group" aria-label="Quick locations">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" className="detect-pill" onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>

            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="overlay-footer setup-footer">
          <span className="muted">One step — then straight to 3D</span>
          <button type="button" className="btn btn-primary" onClick={create}>
            <IconSpark size={16} />
            Create &amp; open 3D
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
