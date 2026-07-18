import { useMemo } from 'react';
import { useCityStore } from '../store/useCityStore';
import { formatCurrency } from '../utils/budgetEstimate';
import { IconCheck, IconSpark } from './Icons';

export function PlansOverlay() {
  const showPlans = useCityStore((s) => s.showPlans);
  const setShowPlans = useCityStore((s) => s.setShowPlans);
  const planOptions = useCityStore((s) => s.planOptions);
  const brief = useCityStore((s) => s.brief);
  const hasCity = useCityStore((s) => !!s.grid);
  const loadCity = useCityStore((s) => s.loadCity);
  const setSelectedPlanId = useCityStore((s) => s.setSelectedPlanId);

  const recommendedId = useMemo(() => {
    if (planOptions.length === 0) return null;
    const inBudget = planOptions.filter((o) => o.summary.withinBudget);
    const pool = inBudget.length ? inBudget : planOptions;
    return pool.reduce((best, cur) =>
      cur.summary.score > best.summary.score ? cur : best
    ).summary.id;
  }, [planOptions]);

  if (!showPlans || planOptions.length === 0) return null;

  return (
    <div
      className="overlay-backdrop plans-backdrop"
      onClick={() => {
        if (hasCity) setShowPlans(false);
      }}
    >
      <div
        className="overlay-panel plans-overlay"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plans-title"
      >
        <div className="overlay-header">
          <div>
            <p className="eyebrow">
              <IconSpark size={12} /> Decide
            </p>
            <h2 id="plans-title">Choose a concept for {brief.name}</h2>
            <p className="setup-subtitle">
              Compare cost and capacity. Recommended picks the best score within budget when possible.
            </p>
          </div>
          {hasCity && (
            <button
              type="button"
              className="close-btn"
              onClick={() => setShowPlans(false)}
              aria-label="Close plans"
            >
              ✕
            </button>
          )}
        </div>

        <div className="overlay-body">
          <div className="compare-grid">
            {planOptions.map(({ summary, result }) => {
              const isRec = summary.id === recommendedId;
              return (
                <article
                  key={summary.id}
                  className={`compare-card ${summary.withinBudget ? 'in-budget' : 'over-budget'} ${
                    isRec ? 'is-recommended' : ''
                  }`}
                >
                  <div className="compare-card-head">
                    <div>
                      {isRec && (
                        <span className="recommend-pill">
                          <IconCheck size={12} /> Recommended
                        </span>
                      )}
                      <h3>{summary.label}</h3>
                    </div>
                    <span className="score-badge">Score {summary.score}</span>
                  </div>
                  <p className="compare-desc">{summary.description}</p>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <label>Cost</label>
                      <span>{formatCurrency(summary.estimatedBudget.total)}</span>
                    </div>
                    <div className="stat-item">
                      <label>Population</label>
                      <span>{summary.populationCapacity.toLocaleString()}</span>
                    </div>
                    <div className="stat-item">
                      <label>Amenities</label>
                      <span>{summary.amenityCount}</span>
                    </div>
                    <div className="stat-item">
                      <label>Happiness</label>
                      <span>{summary.happinessAvg}%</span>
                    </div>
                  </div>
                  <p className={`budget-flag ${summary.withinBudget ? 'ok' : 'over'}`}>
                    {summary.withinBudget ? 'Within budget' : 'Over budget'}
                  </p>
                  <p className="compare-why muted">
                    {isRec
                      ? summary.withinBudget
                        ? 'Best score among plans that fit your envelope.'
                        : 'Highest overall score among generated options.'
                      : summary.withinBudget
                        ? 'Fits budget — compare score against the recommendation.'
                        : 'Exceeds budget — use only if growth is the priority.'}
                  </p>
                  <button
                    type="button"
                    className={`btn ${isRec ? 'btn-primary' : 'btn-secondary'} btn-block`}
                    onClick={() => {
                      setSelectedPlanId(summary.id);
                      loadCity(result);
                    }}
                  >
                    Use this plan
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
