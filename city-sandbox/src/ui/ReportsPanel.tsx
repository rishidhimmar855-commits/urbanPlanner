import { useCityStore } from '../store/useCityStore';

export function ReportsPanel() {
  const reports = useCityStore((s) => s.reports);
  const showReports = useCityStore((s) => s.showReports);
  const activeReport = useCityStore((s) => s.activeReport);
  const setActiveReport = useCityStore((s) => s.setActiveReport);
  const toggleReports = useCityStore((s) => s.toggleReports);

  if (!showReports) return null;

  return (
    <div className="reports-panel">
      <div className="panel-header">
        <h3>Analytics Reports</h3>
        <button className="close-btn" onClick={toggleReports}>
          ✕
        </button>
      </div>

      <div className="reports-list">
        {reports.map((report) => (
          <button
            key={report.type}
            className={`report-item ${activeReport?.type === report.type ? 'active' : ''}`}
            onClick={() => setActiveReport(activeReport?.type === report.type ? null : report)}
          >
            {report.title}
          </button>
        ))}
      </div>

      {activeReport && (
        <div className="report-detail report-selected-hint">
          <p>
            Selected: <strong>{activeReport.title}</strong>
          </p>
          <p className="hint-text">Key metrics are shown on the scene overlay.</p>
        </div>
      )}
    </div>
  );
}
