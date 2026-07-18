import { useCityStore, useCityStats, useSelectedPlanSummary } from '../store/useCityStore';
import { formatCurrency } from '../utils/budgetEstimate';
import { CITY_TYPE_LABELS } from '../core/constants';
import { updateProjectStatus } from '../utils/projectPersistence';
import {
  buildEvidencePack,
  buildSummaryText,
  downloadJson,
  downloadText,
  evidencePackFilename,
  summaryFilename,
} from '../utils/downloadReport';

export function ExportPanel() {
  const showExport = useCityStore((s) => s.showExport);
  const toggleExport = useCityStore((s) => s.toggleExport);
  const brief = useCityStore((s) => s.brief);
  const user = useCityStore((s) => s.user);
  const project = useCityStore((s) => s.project);
  const amenities = useCityStore((s) => s.amenities);
  const landReport = useCityStore((s) => s.landReport);
  const sectors = useCityStore((s) => s.sectors);
  const buildings = useCityStore((s) => s.buildings);
  const roads = useCityStore((s) => s.roads);
  const reports = useCityStore((s) => s.reports);
  const setToast = useCityStore((s) => s.setToast);
  const plan = useSelectedPlanSummary();
  const stats = useCityStats();

  if (!showExport) return null;

  const snapshot = {
    sectors: sectors.length,
    buildings: buildings.length,
    roads: roads.length,
    population: stats?.population ?? plan?.populationCapacity ?? 0,
    happiness: stats?.happiness ?? plan?.happinessAvg ?? 0,
  };

  const markExported = () => {
    if (project) updateProjectStatus(project.id, 'exported');
  };

  const downloadAll = () => {
    downloadJson(
      evidencePackFilename(brief.name),
      buildEvidencePack({
        brief,
        user,
        landReport,
        plan,
        reports,
        snapshot,
        amenities,
      })
    );
    markExported();
    setToast('UrbanVision evidence pack downloaded');
  };

  const downloadSummary = () => {
    downloadText(
      summaryFilename(brief.name),
      buildSummaryText({ brief, user, landReport, plan, snapshot })
    );
    markExported();
    setToast('Summary report downloaded');
  };

  const printReport = () => {
    window.print();
    markExported();
  };

  return (
    <div className="export-panel">
      <div className="panel-header">
        <h3>Export & evidence pack</h3>
        <button type="button" className="close-btn" onClick={toggleExport} aria-label="Close export">
          ✕
        </button>
      </div>
      <div className="panel-body">
        <div className="export-summary">
          <h4>{brief.name}</h4>
          <p>
            {CITY_TYPE_LABELS[brief.cityType]} · target {brief.expectedPopulation.toLocaleString()}{' '}
            · budget {formatCurrency(brief.budget)}
          </p>
          {plan && (
            <p>
              Selected: <strong>{plan.label}</strong> · {formatCurrency(plan.estimatedBudget.total)}{' '}
              · score {plan.score}
            </p>
          )}
          <p className="muted">
            Prepared by {user?.name} ({user?.role}) · UrbanVision
          </p>
        </div>

        <div className="tile-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={downloadAll}>
            Download all (JSON)
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadSummary}>
            Download summary
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={printReport}>
            Print / PDF
          </button>
        </div>

        <div className="panel-section print-only-block">
          <h4>Report preview</h4>
          <div className="report-row">
            <span>Sectors</span>
            <span>{sectors.length}</span>
          </div>
          <div className="report-row">
            <span>Buildings</span>
            <span>{buildings.length}</span>
          </div>
          <div className="report-row">
            <span>Roads</span>
            <span>{roads.length}</span>
          </div>
          <div className="report-row">
            <span>Amenities requested</span>
            <span>{amenities.reduce((s, a) => s + a.count, 0)}</span>
          </div>
          {landReport && (
            <div className="report-row">
              <span>Land score</span>
              <span>{landReport.overallScore}/100</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
