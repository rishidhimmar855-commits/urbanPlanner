import { useCallback, useMemo, useRef, useState } from 'react';
import { useCityStore } from '../store/useCityStore';
import { buildReportOverlayModel } from './reports/reportOverlayModel';
import type { OverlayLegend } from './reports/reportOverlayModel';
import { ReportThumb } from './reports/ReportThumbs';
import { SourceHeatmapPreview } from './reports/SourceHeatmapPreview';
import {
  reportSupportsSourceHeatmap,
  resolveReportHeatmap,
} from './reports/resolveReportHeatmap';
import {
  buildDownloadableReportPreview,
  compositeHeatmapOnSource,
  downloadCanvasPng,
  downloadTextFile,
} from '../utils/sourceMapPreview';

function LegendBar({ legend }: { legend: OverlayLegend }) {
  if (legend.swatches && legend.swatches.length > 0) {
    return (
      <div className="overlay-legend swatches">
        {legend.swatches.map((s) => (
          <span key={s.label} className="legend-swatch-item">
            <i style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    );
  }

  const gradientClass = legend.gradient ? `grad-${legend.gradient}` : 'grad-heat';
  return (
    <div className="overlay-legend">
      <span>{legend.lowLabel}</span>
      <div className={`legend-gradient ${gradientClass}`} />
      <span>{legend.highLabel}</span>
    </div>
  );
}

export function ReportOverlay() {
  const activeReport = useCityStore((s) => s.activeReport);
  const sectors = useCityStore((s) => s.sectors);
  const grid = useCityStore((s) => s.grid);
  const project = useCityStore((s) => s.project);
  const sourceMapDataUrl = useCityStore((s) => s.sourceMapDataUrl);
  const setActiveReport = useCityStore((s) => s.setActiveReport);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const model = useMemo(
    () => (activeReport ? buildReportOverlayModel(activeReport, sectors) : null),
    [activeReport, sectors]
  );

  const heatmap = useMemo(
    () => (activeReport ? resolveReportHeatmap(activeReport, sectors, grid) : null),
    [activeReport, sectors, grid]
  );

  const showSourceHeatmap =
    !!activeReport &&
    !!sourceMapDataUrl &&
    !!heatmap &&
    reportSupportsSourceHeatmap(activeReport.type);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    mapCanvasRef.current = canvas;
  }, []);

  const handleDownloadPreview = async () => {
    if (!activeReport || !model) return;
    setDownloading(true);
    try {
      let mapCanvas = mapCanvasRef.current;
      if (!mapCanvas && sourceMapDataUrl && heatmap) {
        mapCanvas = await compositeHeatmapOnSource({
          sourceDataUrl: sourceMapDataUrl,
          heatmap: heatmap.data,
          heatWidth: heatmap.width,
          heatHeight: heatmap.height,
          maxSize: 720,
        });
      }

      const preview = buildDownloadableReportPreview({
        title: model.title,
        projectName: project?.name ?? 'City Sandbox',
        kpis: model.kpis,
        insight: model.insight,
        legend: model.legend,
        mapCanvas,
        secondaryNote: showSourceHeatmap
          ? 'Heatmap overlaid on source terrain map · readable without 3D view'
          : 'Static report preview · City Sandbox',
      });

      const slug = activeReport.type.replace(/_/g, '-');
      downloadCanvasPng(preview, `${slug}-report-preview.png`);

      const md = [
        `# ${model.title}`,
        '',
        `Project: ${project?.name ?? 'City Sandbox'}`,
        '',
        '## Key metrics',
        ...model.kpis.map((k) => `- **${k.label}:** ${k.value}`),
        '',
        model.insight ? `> ${model.insight}` : '',
        '',
        showSourceHeatmap
          ? '_See accompanying PNG for heatmap overlaid on the source terrain map._'
          : '_See accompanying PNG for charts/summary._',
        '',
      ]
        .filter(Boolean)
        .join('\n');
      downloadTextFile(md, `${slug}-report.md`);
    } finally {
      setDownloading(false);
    }
  };

  if (!activeReport || !model) return null;

  return (
    <div className="report-overlay" role="dialog" aria-label={model.title}>
      <div className="report-overlay-card">
        <div className="report-overlay-header">
          <h3>{model.title}</h3>
          <button
            type="button"
            className="close-btn"
            onClick={() => setActiveReport(null)}
            aria-label="Close report overlay"
          >
            ✕
          </button>
        </div>

        <div className="overlay-kpis">
          {model.kpis.map((kpi) => (
            <div key={kpi.label} className="overlay-kpi">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-value">{kpi.value}</span>
            </div>
          ))}
        </div>

        {model.insight && <p className="overlay-insight">{model.insight}</p>}

        {showSourceHeatmap && sourceMapDataUrl && heatmap ? (
          <SourceHeatmapPreview
            sourceDataUrl={sourceMapDataUrl}
            heatmap={heatmap}
            onCanvasReady={handleCanvasReady}
          />
        ) : (
          <div className="overlay-thumbs">
            <ReportThumb visual={model.visualA} label={model.visualALabel} />
            <ReportThumb visual={model.visualB} label={model.visualBLabel} />
          </div>
        )}

        {showSourceHeatmap && (
          <div className="overlay-thumbs compact-thumbs">
            <ReportThumb visual={model.visualB} label={model.visualBLabel} />
          </div>
        )}

        {model.legend && <LegendBar legend={model.legend} />}

        <div className="overlay-actions">
          <button
            type="button"
            className="primary-btn overlay-download-btn"
            onClick={() => void handleDownloadPreview()}
            disabled={downloading}
          >
            {downloading ? 'Preparing…' : 'Download preview (PNG + MD)'}
          </button>
          <p className="overlay-download-hint">
            Includes map + metrics so the report is readable without the 3D view.
          </p>
        </div>
      </div>
    </div>
  );
}
