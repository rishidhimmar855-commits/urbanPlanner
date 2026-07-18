import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCityStore } from '../store/useCityStore';
import { CITY_TYPE_LABELS, MAX_GRID_SIZE, SAMPLE_GRID_SIZE, TERRAIN_COLORS } from '../core/constants';
import { loadImageFromFile, createSampleTerrain } from '../utils/colorDetection';
import {
  classifyLandImage,
  createDemoSatelliteImage,
  mixPercents,
  terrainGridToDataUrl,
  type LandDetectMode,
} from '../utils/landClassify';
import { analyzeLandReadiness, suggestAmenitiesFromAdvice } from '../utils/landReadiness';
import { generatePlanOptions } from '../managers/ProjectManager';
import { saveProjectDraft, listSavedProjects, loadProjectDraft } from '../utils/projectPersistence';
import { TerrainType, type CityType, type ProjectBrief } from '../types';
import { formatCurrency } from '../utils/budgetEstimate';
import { IconBrief, IconLand, IconSave, IconSpark, IconBack, IconArrowRight, IconCheck } from './Icons';

const CITY_TYPES = Object.keys(CITY_TYPE_LABELS) as CityType[];
const PRIORITIES = ['Housing', 'Jobs', 'Transit', 'Environment', 'Health', 'Education'];

const DETECT_MODES: { id: LandDetectMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'photo', label: 'Photo' },
  { id: 'legend', label: 'Legend' },
];

const MIX_LABELS: { type: TerrainType; label: string }[] = [
  { type: TerrainType.LowFertility, label: 'Buildable' },
  { type: TerrainType.HighFertility, label: 'Fertile' },
  { type: TerrainType.Forest, label: 'Forest' },
  { type: TerrainType.Water, label: 'Water' },
  { type: TerrainType.HighMinerals, label: 'Minerals' },
];

type SetupTab = 'brief' | 'land' | 'review' | 'saved';

type DetectMeta = {
  modeUsed: 'legend' | 'photo' | 'sample' | 'saved';
  confidence: number;
  previewUrl: string;
  sourceUrl?: string;
  mixPct: Record<TerrainType, number>;
};

const TABS: {
  id: SetupTab;
  step: number;
  label: string;
  hint: string;
  Icon: typeof IconBrief;
}[] = [
  { id: 'brief', step: 1, label: 'Brief', hint: 'Goals & budget', Icon: IconBrief },
  { id: 'land', step: 2, label: 'Land', hint: 'Detect soil', Icon: IconLand },
  { id: 'review', step: 3, label: 'Review', hint: 'Score & generate', Icon: IconCheck },
];

export function SetupOverlay() {
  const showSetup = useCityStore((s) => s.showSetup);
  const setShowSetup = useCityStore((s) => s.setShowSetup);
  const brief = useCityStore((s) => s.brief);
  const setBrief = useCityStore((s) => s.setBrief);
  const amenities = useCityStore((s) => s.amenities);
  const setAmenities = useCityStore((s) => s.setAmenities);
  const terrainGrid = useCityStore((s) => s.terrainGrid);
  const setTerrainGrid = useCityStore((s) => s.setTerrainGrid);
  const landReport = useCityStore((s) => s.landReport);
  const setLandReport = useCityStore((s) => s.setLandReport);
  const setProject = useCityStore((s) => s.setProject);
  const setGenerating = useCityStore((s) => s.setGenerating);
  const setGenerationProgress = useCityStore((s) => s.setGenerationProgress);
  const setPlanOptions = useCityStore((s) => s.setPlanOptions);
  const setShowPlans = useCityStore((s) => s.setShowPlans);
  const setToast = useCityStore((s) => s.setToast);
  const hasCity = useCityStore((s) => !!s.grid);
  const [tab, setTab] = useState<SetupTab>('brief');
  const [dragOver, setDragOver] = useState(false);
  const [landError, setLandError] = useState<string | null>(null);
  const [detectMode, setDetectMode] = useState<LandDetectMode>('auto');
  const [detectMeta, setDetectMeta] = useState<DetectMeta | null>(null);
  const [detecting, setDetecting] = useState(false);

  const commitTerrain = useCallback(
    (
      grid: ReturnType<typeof createSampleTerrain>,
      meta?: Partial<DetectMeta> & { toastMsg?: string }
    ) => {
      setLandError(null);
      setTerrainGrid(grid);
      const report = analyzeLandReadiness(grid, brief.expectedPopulation, brief.cityType);
      setLandReport(report);
      setAmenities(suggestAmenitiesFromAdvice(report.amenityAdvice));

      const mix: Record<TerrainType, number> = {
        [TerrainType.HighFertility]: 0,
        [TerrainType.LowFertility]: 0,
        [TerrainType.HighMinerals]: 0,
        [TerrainType.Water]: 0,
        [TerrainType.Forest]: 0,
      };
      for (const row of grid) for (const cell of row) mix[cell]++;

      setDetectMeta({
        modeUsed: meta?.modeUsed ?? 'sample',
        confidence: meta?.confidence ?? 100,
        previewUrl: meta?.previewUrl ?? terrainGridToDataUrl(grid),
        sourceUrl: meta?.sourceUrl,
        mixPct: meta?.mixPct ?? mixPercents(mix),
      });

      const id = uuidv4();
      setProject({
        id,
        name: brief.name,
        createdAt: Date.now(),
        gridWidth: grid[0]?.length ?? 0,
        gridHeight: grid.length,
        cellSize: 3,
        expectedPopulation: brief.expectedPopulation,
        budget: brief.budget,
        cityType: brief.cityType,
        priorities: brief.priorities,
        status: 'planning',
      });
      saveProjectDraft({
        meta: {
          id,
          name: brief.name,
          status: 'planning',
          cityType: brief.cityType,
          expectedPopulation: brief.expectedPopulation,
          budget: brief.budget,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          previewUrl: meta?.previewUrl ?? terrainGridToDataUrl(grid),
        },
        brief,
        amenities: suggestAmenitiesFromAdvice(report.amenityAdvice),
        terrainGrid: grid,
      });
      setToast(
        meta?.toastMsg ??
          'Land detected — review readiness, then generate plans'
      );
      setTab('review');
    },
    [brief, setAmenities, setLandReport, setProject, setTerrainGrid, setToast]
  );

  if (!showSetup) return null;

  const update = (patch: Partial<ProjectBrief>) => setBrief({ ...brief, ...patch });
  const briefReady = brief.name.trim().length > 0 && brief.expectedPopulation >= 1000 && brief.budget > 0;
  const canGenerate = !!terrainGrid && briefReady;

  const handleUpload = async (file: File) => {
    setDetecting(true);
    setLandError(null);
    try {
      await new Promise<void>((r) => setTimeout(r, 220));
      const imageData = await loadImageFromFile(file);
      const sourceUrl = URL.createObjectURL(file);
      const result = classifyLandImage(imageData, MAX_GRID_SIZE, detectMode);
      commitTerrain(result.terrainGrid, {
        modeUsed: result.modeUsed,
        confidence: result.confidence,
        previewUrl: terrainGridToDataUrl(result.terrainGrid),
        sourceUrl,
        mixPct: mixPercents(result.mix),
        toastMsg:
          result.modeUsed === 'photo'
            ? `Photo classified (${result.confidence}% confidence) — review detected soil map`
            : `Legend map read (${result.confidence}% match) — review land mix`,
      });
    } catch {
      setLandError(
        'Could not read that image. Try a clearer satellite screenshot or a color-legend map.'
      );
    } finally {
      setDetecting(false);
    }
  };

  const runDemoSatellite = async () => {
    setDetecting(true);
    setLandError(null);
    setDetectMode('photo');
    try {
      await new Promise<void>((r) => setTimeout(r, 280));
      const imageData = createDemoSatelliteImage(256);
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext('2d')?.putImageData(imageData, 0, 0);
      const sourceUrl = canvas.toDataURL('image/png');
      const result = classifyLandImage(imageData, MAX_GRID_SIZE, 'photo');
      commitTerrain(result.terrainGrid, {
        modeUsed: 'photo',
        confidence: result.confidence,
        previewUrl: terrainGridToDataUrl(result.terrainGrid),
        sourceUrl,
        mixPct: mixPercents(result.mix),
        toastMsg: `Demo satellite classified (${result.confidence}% confidence)`,
      });
    } catch {
      setLandError('Demo satellite classify failed. Try uploading an image instead.');
    } finally {
      setDetecting(false);
    }
  };

  const generate = async () => {
    if (!terrainGrid) {
      setTab('land');
      setLandError('Upload a land map or load the sample before generating.');
      return;
    }
    if (!briefReady) {
      setTab('brief');
      setToast('Complete the project brief first');
      return;
    }
    setGenerationProgress({ stage: 'terrain', progress: 0, message: 'Preparing plan options…' });
    setShowSetup(false);
    setGenerating(true);
    try {
      const options = await generatePlanOptions(
        terrainGrid,
        {
          expectedPopulation: brief.expectedPopulation,
          budget: brief.budget,
          cityType: brief.cityType,
          amenities,
        },
        setGenerationProgress
      );
      setPlanOptions(options);
      setGenerating(false);
      setShowPlans(true);
    } catch (e) {
      console.error(e);
      setGenerating(false);
      setShowSetup(true);
      setToast(e instanceof Error ? e.message : 'Generation failed');
    }
  };

  const openSaved = (id: string) => {
    const draft = loadProjectDraft(id);
    if (!draft) return;
    setBrief(draft.brief);
    setAmenities(draft.amenities);
    setTerrainGrid(draft.terrainGrid);
    const report = analyzeLandReadiness(
      draft.terrainGrid,
      draft.brief.expectedPopulation,
      draft.brief.cityType
    );
    setLandReport(report);
    setDetectMeta({
      modeUsed: 'saved',
      confidence: 100,
      previewUrl: terrainGridToDataUrl(draft.terrainGrid),
      mixPct: mixPercents(
        (() => {
          const mix: Record<TerrainType, number> = {
            [TerrainType.HighFertility]: 0,
            [TerrainType.LowFertility]: 0,
            [TerrainType.HighMinerals]: 0,
            [TerrainType.Water]: 0,
            [TerrainType.Forest]: 0,
          };
          for (const row of draft.terrainGrid) for (const cell of row) mix[cell]++;
          return mix;
        })()
      ),
    });
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
    setToast(`Loaded “${draft.brief.name}”`);
    setTab('review');
  };

  const saved = listSavedProjects();
  const scoreBand =
    !landReport ? null : landReport.overallScore >= 70 ? 'good' : landReport.overallScore >= 45 ? 'ok' : 'low';

  return (
    <div className="overlay-backdrop" onClick={() => hasCity && setShowSetup(false)}>
      <div
        className="overlay-panel setup-overlay"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
      >
        <div className="overlay-header setup-header-bar">
          <div>
            <p className="eyebrow">
              <IconSpark size={12} /> UrbanVision
            </p>
            <h2 id="setup-title">Project setup</h2>
            <p className="setup-subtitle">
              Three steps: brief, detect land, review — then generate plan options.
            </p>
          </div>
          <div className="setup-header-actions">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${tab === 'saved' ? 'is-active' : ''}`}
              onClick={() => setTab('saved')}
            >
              <IconSave size={14} />
              Saved
            </button>
            {hasCity && (
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowSetup(false)}
                aria-label="Close setup"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {tab !== 'saved' && (
          <div className="setup-steps" role="tablist" aria-label="Setup steps">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`setup-step ${tab === item.id ? 'active' : ''} ${
                  item.id === 'land' && terrainGrid ? 'done' : ''
                } ${item.id === 'brief' && briefReady ? 'done' : ''} ${
                  item.id === 'review' && canGenerate ? 'done' : ''
                }`}
                onClick={() => {
                  if (item.id === 'review' && !terrainGrid) {
                    setTab('land');
                    setLandError('Upload or load land before review.');
                    return;
                  }
                  if (item.id === 'land' && !briefReady) {
                    setTab('brief');
                    setToast('Complete the brief first');
                    return;
                  }
                  setTab(item.id);
                }}
              >
                <span className="setup-step-num">
                  <item.Icon size={14} />
                </span>
                <span className="setup-step-copy">
                  <strong>
                    {item.step}. {item.label}
                  </strong>
                  <span>{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="overlay-body setup-body">
          {tab === 'brief' && (
            <div className="setup-section">
              <div className="setup-section-head">
                <h3>Project brief</h3>
                <p className="muted">These values guide density, amenities, and budget checks.</p>
              </div>

              <div className="form-stack">
                <label className="field">
                  <span>City / project name</span>
                  <input
                    value={brief.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="e.g. Green Corridor Township"
                  />
                </label>

                <div className="form-row-2">
                  <label className="field">
                    <span>Expected population</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={brief.expectedPopulation}
                      onChange={(e) => update({ expectedPopulation: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label className="field">
                    <span>Budget (₹)</span>
                    <input
                      type="number"
                      min={1_000_000}
                      step={1_000_000}
                      value={brief.budget}
                      onChange={(e) => update({ budget: Number(e.target.value) || 0 })}
                    />
                    <span className="field-hint">{formatCurrency(brief.budget)} envelope</span>
                  </label>
                </div>

                <fieldset className="choice-fieldset">
                  <legend>City type</legend>
                  <div className="choice-grid">
                    {CITY_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`choice-chip ${brief.cityType === t ? 'active' : ''}`}
                        onClick={() => update({ cityType: t })}
                      >
                        {CITY_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="choice-fieldset">
                  <legend>Priority goals (up to 3)</legend>
                  <div className="choice-grid">
                    {PRIORITIES.map((p) => {
                      const selected = brief.priorities.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          className={`choice-chip ${selected ? 'active' : ''}`}
                          onClick={() => {
                            update({
                              priorities: selected
                                ? brief.priorities.filter((x) => x !== p)
                                : brief.priorities.length >= 3
                                  ? brief.priorities
                                  : [...brief.priorities, p],
                            });
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
          )}

          {tab === 'land' && (
            <div className="setup-section">
              <div className="setup-section-head">
                <h3>Detect land</h3>
                <p className="muted">
                  Drop a satellite screenshot or legend map. Auto-detect chooses the right classifier.
                </p>
              </div>

              <div className="detect-mode-pills" role="group" aria-label="Detection mode">
                {DETECT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`detect-pill ${detectMode === m.id ? 'active' : ''}`}
                    onClick={() => setDetectMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div
                className={`setup-dropzone ${dragOver ? 'drag-over' : ''} ${terrainGrid ? 'has-land' : ''} ${detecting ? 'is-detecting' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file?.type.startsWith('image/')) await handleUpload(file);
                }}
              >
                <div className="setup-dropzone-icon" aria-hidden>
                  <IconLand size={22} />
                </div>
                <p className="setup-dropzone-title">
                  {detecting ? 'Detecting soil & land…' : 'Drop image to classify'}
                </p>
                <p className="muted">PNG or JPG · satellite, drone, or color legend</p>
                <label className="btn btn-primary btn-sm setup-browse">
                  {detecting ? 'Working…' : 'Browse image'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={detecting}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="land-alt-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={detecting}
                  onClick={() =>
                    commitTerrain(createSampleTerrain(SAMPLE_GRID_SIZE, SAMPLE_GRID_SIZE), {
                      modeUsed: 'sample',
                      confidence: 100,
                      toastMsg: 'Sample land loaded — review readiness',
                    })
                  }
                >
                  Use sample map
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={detecting}
                  onClick={runDemoSatellite}
                >
                  Demo satellite
                </button>
              </div>

              {landError && (
                <p className="field-error" role="alert">
                  {landError}
                </p>
              )}

              {terrainGrid && (
                <p className="land-ready-hint">
                  <IconCheck size={14} /> Land classified — continue to Review
                </p>
              )}
            </div>
          )}

          {tab === 'review' && (
            <div className="setup-section">
              <div className="setup-section-head">
                <h3>Review &amp; generate</h3>
                <p className="muted">
                  Confirm soil mix and readiness before generating Budget / Balanced plan options.
                </p>
              </div>

              {!terrainGrid ? (
                <div className="empty-panel setup-empty">
                  <h4>No land yet</h4>
                  <p>Go back to Land and upload an image or load a sample.</p>
                  <button type="button" className="btn btn-primary" onClick={() => setTab('land')}>
                    Detect land
                  </button>
                </div>
              ) : (
                <>
                  <div className="review-brief-chip">
                    <strong>{brief.name}</strong>
                    <span>
                      {brief.expectedPopulation.toLocaleString()} people · {formatCurrency(brief.budget)} ·{' '}
                      {CITY_TYPE_LABELS[brief.cityType]}
                    </span>
                  </div>

                  {detectMeta && (
                    <div className="land-detect-card">
                      <div className="land-detect-head">
                        <div>
                          <h4>Detected soil map</h4>
                          <p className="muted">
                            {detectMeta.modeUsed === 'photo' && 'Photo classifier'}
                            {detectMeta.modeUsed === 'legend' && 'Legend matcher'}
                            {detectMeta.modeUsed === 'sample' && 'Sample landscape'}
                            {detectMeta.modeUsed === 'saved' && 'Saved draft'}
                            {' · '}
                            {terrainGrid.length}×{terrainGrid[0]?.length ?? 0} cells
                          </p>
                        </div>
                        <span className="detect-confidence">{detectMeta.confidence}% confidence</span>
                      </div>
                      <div
                        className={`land-detect-preview ${detectMeta.sourceUrl ? 'has-source' : ''}`}
                      >
                        {detectMeta.sourceUrl && (
                          <figure className="land-preview-fig">
                            <img
                              src={detectMeta.sourceUrl}
                              alt="Uploaded land source"
                              className="land-preview-img"
                            />
                            <figcaption>Source</figcaption>
                          </figure>
                        )}
                        <figure className="land-preview-fig">
                          <img
                            src={detectMeta.previewUrl}
                            alt="Classified terrain preview"
                            className="land-preview-img"
                          />
                          <figcaption>Classes</figcaption>
                        </figure>
                        <div className="land-mix-bars" aria-label="Land mix">
                          {MIX_LABELS.map(({ type, label }) => (
                            <div key={type} className="land-mix-row">
                              <span
                                className="swatch"
                                style={{ background: TERRAIN_COLORS[type] }}
                                aria-hidden
                              />
                              <span className="land-mix-label">{label}</span>
                              <div className="land-mix-track">
                                <div
                                  className="land-mix-fill"
                                  style={{
                                    width: `${Math.min(100, detectMeta.mixPct[type])}%`,
                                    background: TERRAIN_COLORS[type],
                                  }}
                                />
                              </div>
                              <span className="land-mix-pct">{detectMeta.mixPct[type]}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {landReport && (
                    <div className={`setup-readiness score-${scoreBand}`}>
                      <div className={`score-ring score-${scoreBand}`}>
                        <strong>{landReport.overallScore}</strong>
                        <span>/100</span>
                      </div>
                      <div>
                        <h4>Land readiness</h4>
                        <p>{landReport.summary}</p>
                        <div className="setup-readiness-meta">
                          <span>Buildable {landReport.buildablePercent}%</span>
                          <span>Forest {landReport.forestPercent}%</span>
                          <span>Water {landReport.waterPercent}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'saved' && (
            <div className="setup-section">
              <div className="setup-section-head">
                <h3>Saved drafts</h3>
                <p className="muted">Resume a draft into this setup, then generate from Review.</p>
              </div>

              {saved.length === 0 ? (
                <div className="empty-panel setup-empty">
                  <h4>No saved projects</h4>
                  <p>Complete a brief and land upload to create your first draft.</p>
                  <button type="button" className="btn btn-primary" onClick={() => setTab('brief')}>
                    Start with brief
                  </button>
                </div>
              ) : (
                <ul className="saved-list">
                  {saved.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="saved-row" onClick={() => openSaved(p.id)}>
                        <span className="saved-row-main">
                          <strong>{p.name}</strong>
                          <span className="muted">
                            {CITY_TYPE_LABELS[p.cityType]} · {p.expectedPopulation.toLocaleString()}{' '}
                            people · {formatCurrency(p.budget)}
                          </span>
                        </span>
                        <span className={`status-chip ${p.status}`}>{p.status.replace('_', ' ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="overlay-footer setup-footer">
          <div className="setup-footer-status">
            {tab === 'brief' && !briefReady && (
              <span className="muted">Name, population, and budget required</span>
            )}
            {tab === 'brief' && briefReady && (
              <span className="muted">Brief ready — continue to land</span>
            )}
            {tab === 'land' && !terrainGrid && (
              <span className="muted">Upload an image or use a sample</span>
            )}
            {tab === 'land' && terrainGrid && (
              <span className="setup-ready-pill">Land ready — review next</span>
            )}
            {tab === 'review' && canGenerate && (
              <span className="setup-ready-pill">Ready to generate</span>
            )}
            {tab === 'saved' && <span className="muted">Pick a draft to resume</span>}
          </div>
          <div className="btn-row">
            {tab !== 'brief' && tab !== 'saved' && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setTab(tab === 'review' ? 'land' : 'brief')}
              >
                <IconBack size={16} />
                Back
              </button>
            )}
            {tab === 'saved' && (
              <button type="button" className="btn btn-ghost" onClick={() => setTab('brief')}>
                <IconBack size={16} />
                Back to brief
              </button>
            )}
            {tab === 'brief' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setTab('land')}
                disabled={!briefReady}
              >
                Next: Land
                <IconArrowRight size={16} />
              </button>
            )}
            {tab === 'land' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!terrainGrid}
                onClick={() => setTab('review')}
              >
                Next: Review
                <IconArrowRight size={16} />
              </button>
            )}
            {tab === 'review' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canGenerate}
                onClick={generate}
              >
                <IconSpark size={16} />
                Generate plans
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
