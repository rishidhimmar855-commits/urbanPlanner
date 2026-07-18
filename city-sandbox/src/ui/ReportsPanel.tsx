import { useCityStore } from '../store/useCityStore';
import { ReportType } from '../types';

interface ReportsPanelProps {
  mode?: 'overlay' | 'page';
}

export function ReportsPanel({ mode = 'overlay' }: ReportsPanelProps) {
  const reports = useCityStore((s) => s.reports);
  const showReports = useCityStore((s) => s.showReports);
  const activeReport = useCityStore((s) => s.activeReport);
  const setActiveReport = useCityStore((s) => s.setActiveReport);
  const toggleReports = useCityStore((s) => s.toggleReports);

  if (mode === 'overlay' && !showReports) return null;

  return (
    <div className={mode === 'page' ? 'reports-panel reports-panel-page' : 'reports-panel'}>
      <div className="panel-header">
        <h3>Analytics reports</h3>
        {mode === 'overlay' && (
          <button type="button" className="close-btn" onClick={toggleReports} aria-label="Close reports">
            ✕
          </button>
        )}
      </div>

      <div className="reports-list">
        {reports.length === 0 && <p className="muted panel-empty">No reports generated yet.</p>}
        {reports.map((report) => (
          <button
            key={report.type}
            type="button"
            className={`report-item ${activeReport?.type === report.type ? 'active' : ''}`}
            onClick={() => setActiveReport(activeReport?.type === report.type ? null : report)}
          >
            {report.title}
          </button>
        ))}
      </div>

      {activeReport && (
        <div className="report-detail">
          <h4>{activeReport.title}</h4>
          <ReportContent report={activeReport} />
        </div>
      )}
    </div>
  );
}

function ReportContent({ report }: { report: import('../types').AnalyticsReport }) {
  const { data, heatmap, heatmapWidth, heatmapHeight } = report;

  if (report.type === ReportType.Population && heatmap && heatmapWidth && heatmapHeight) {
    return <HeatmapCanvas data={heatmap} width={heatmapWidth} height={heatmapHeight} />;
  }

  return (
    <div className="report-data">
      {Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="report-section">
              <strong>{formatKey(key)}</strong>
              <pre>{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }
        return (
          <div key={key} className="report-row">
            <span>{formatKey(key)}</span>
            <span>{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : String(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function HeatmapCanvas({
  data,
  width,
  height,
}: {
  data: Float32Array;
  width: number;
  height: number;
}) {
  const max = Math.max(...data, 1);
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const t = data[i] / max;
      const idx = i * 4;
      imageData.data[idx] = Math.floor(t * 255);
      imageData.data[idx + 1] = Math.floor((1 - t) * 100);
      imageData.data[idx + 2] = Math.floor((1 - t) * 255);
      imageData.data[idx + 3] = data[i] > 0 ? 200 : 0;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div className="heatmap-container">
      <canvas ref={canvasRef} className="heatmap-canvas" />
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}
