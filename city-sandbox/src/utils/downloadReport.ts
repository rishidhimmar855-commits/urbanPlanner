import type { AnalyticsReport, GovUser, LandReadinessReport, PlanOptionSummary, ProjectBrief } from '../types';
import { formatCurrency } from './budgetEstimate';

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
}

export function downloadText(filename: string, text: string) {
  downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

function slug(name: string) {
  return name.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

export function buildEvidencePack(input: {
  brief: ProjectBrief;
  user: GovUser | null;
  landReport: LandReadinessReport | null;
  plan: PlanOptionSummary | null;
  reports: AnalyticsReport[];
  snapshot: {
    sectors: number;
    buildings: number;
    roads: number;
    population: number;
    happiness: number;
  };
  amenities: { type: string; label: string; count: number }[];
}) {
  return {
    product: 'UrbanVision',
    exportedAt: new Date().toISOString(),
    officer: input.user,
    brief: input.brief,
    landReadiness: input.landReport
      ? {
          overallScore: input.landReport.overallScore,
          summary: input.landReport.summary,
          buildablePercent: input.landReport.buildablePercent,
        }
      : null,
    selectedPlan: input.plan,
    amenities: input.amenities,
    citySnapshot: input.snapshot,
    reports: input.reports.map((r) => ({
      type: r.type,
      title: r.title,
      data: r.data,
    })),
  };
}

export function evidencePackFilename(projectName: string) {
  return `urbanvision-${slug(projectName)}-evidence-pack.json`;
}

export function singleReportFilename(projectName: string, reportTitle: string) {
  return `urbanvision-${slug(projectName)}-${slug(reportTitle)}.json`;
}

export function buildSummaryText(input: {
  brief: ProjectBrief;
  user: GovUser | null;
  landReport: LandReadinessReport | null;
  plan: PlanOptionSummary | null;
  snapshot: {
    sectors: number;
    buildings: number;
    roads: number;
    population: number;
    happiness: number;
  };
}) {
  const lines = [
    'UrbanVision — Planning Summary Report',
    '====================================',
    `Generated: ${new Date().toLocaleString()}`,
    `Officer: ${input.user?.name ?? '—'} (${input.user?.role ?? '—'})`,
    '',
    `Project: ${input.brief.name}`,
    `City type: ${input.brief.cityType}`,
    `Target population: ${input.brief.expectedPopulation.toLocaleString()}`,
    `Timeline: ${input.brief.timelineMonths ?? 36} months`,
    `Budget: ${formatCurrency(input.brief.budget)}`,
    `Priorities: ${input.brief.priorities.join(', ') || '—'}`,
    '',
    `Land score: ${input.landReport?.overallScore ?? '—'} / 100`,
    `Land note: ${input.landReport?.summary ?? '—'}`,
    '',
    `Selected plan: ${input.plan?.label ?? '—'}`,
    `Plan cost: ${input.plan ? formatCurrency(input.plan.estimatedBudget.total) : '—'}`,
    `Plan score: ${input.plan?.score ?? '—'}`,
    '',
    `Sectors: ${input.snapshot.sectors}`,
    `Buildings: ${input.snapshot.buildings}`,
    `Roads: ${input.snapshot.roads}`,
    `Population: ${input.snapshot.population.toLocaleString()}`,
    `Happiness: ${input.snapshot.happiness.toFixed?.(1) ?? input.snapshot.happiness}%`,
    '',
    '— End of UrbanVision summary —',
  ];
  return lines.join('\n');
}

export function summaryFilename(projectName: string) {
  return `urbanvision-${slug(projectName)}-summary.txt`;
}

export function pdfReportFilename(projectName: string) {
  return `urbanvision-${slug(projectName)}-report.html`;
}

export type ProjectReportDoc = {
  brief: ProjectBrief;
  user: GovUser | null;
  landReport: LandReadinessReport | null;
  plan: PlanOptionSummary | null;
  snapshot: {
    sectors: number;
    buildings: number;
    roads: number;
    population: number;
    happiness: number;
  };
  previewUrl?: string | null;
  status?: string;
  reports?: AnalyticsReport[];
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Printable HTML that reads like a PDF planning brief. */
export function buildReportHtml(doc: ProjectReportDoc): string {
  const timeline = doc.brief.timelineMonths ?? 36;
  const rows = [
    ['Project', doc.brief.name],
    ['City type', doc.brief.cityType],
    ['Population aiming', doc.brief.expectedPopulation.toLocaleString()],
    ['Timeline', `${timeline} months`],
    ['Budget', formatCurrency(doc.brief.budget)],
    ['Priorities', doc.brief.priorities.join(', ') || '—'],
    ['Coordinates', doc.brief.latitude != null && doc.brief.longitude != null
      ? `${doc.brief.latitude.toFixed(4)}, ${doc.brief.longitude.toFixed(4)}`
      : '—'],
    ['Land score', doc.landReport ? `${doc.landReport.overallScore} / 100` : '—'],
    ['Selected plan', doc.plan?.label ?? 'Draft / not generated'],
    ['Plan cost', doc.plan ? formatCurrency(doc.plan.estimatedBudget.total) : '—'],
    ['Live population', doc.snapshot.population.toLocaleString()],
    ['Happiness', `${typeof doc.snapshot.happiness === 'number' ? doc.snapshot.happiness.toFixed(0) : doc.snapshot.happiness}%`],
    ['Sectors', String(doc.snapshot.sectors)],
    ['Buildings', String(doc.snapshot.buildings)],
    ['Roads', String(doc.snapshot.roads)],
  ];

  const metricBlocks =
    doc.reports
      ?.slice(0, 4)
      .map((r) => {
        const entries = Object.entries(r.data)
          .filter(([, v]) => typeof v !== 'object')
          .slice(0, 6)
          .map(
            ([k, v]) =>
              `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(
                typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : String(v)
              )}</td></tr>`
          )
          .join('');
        return `<h3>${escapeHtml(r.title)}</h3><table>${entries || '<tr><td colspan="2">See evidence pack</td></tr>'}</table>`;
      })
      .join('') ?? '';

  const img = doc.previewUrl
    ? `<img class="map" src="${doc.previewUrl}" alt="Land preview" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>UrbanVision — ${escapeHtml(doc.brief.name)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1f1c; margin: 0; background: #e8e6e1; }
  .page { max-width: 760px; margin: 24px auto; background: #fff; padding: 40px 48px; box-shadow: 0 8px 32px rgba(0,0,0,.12); }
  .brand { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #1f7a5c; font-family: system-ui, sans-serif; }
  h1 { font-size: 28px; margin: 8px 0 4px; font-weight: 700; }
  .meta { color: #5a635e; font-size: 13px; margin-bottom: 24px; font-family: system-ui, sans-serif; }
  .map { width: 100%; max-height: 220px; object-fit: cover; border-radius: 4px; margin: 16px 0 24px; border: 1px solid #d5d8d4; image-rendering: pixelated; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-family: system-ui, sans-serif; font-size: 13px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e4e6e2; vertical-align: top; }
  td:first-child { width: 38%; color: #5a635e; }
  h2 { font-size: 16px; margin: 28px 0 8px; border-bottom: 2px solid #1f7a5c; padding-bottom: 6px; }
  h3 { font-size: 14px; margin: 18px 0 6px; font-family: system-ui, sans-serif; color: #1f7a5c; }
  .note { font-size: 13px; line-height: 1.5; color: #333; margin: 8px 0 16px; }
  .footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #888; font-family: system-ui, sans-serif; }
  @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; max-width: none; } }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">UrbanVision · Smart City Mission</div>
    <h1>${escapeHtml(doc.brief.name)}</h1>
    <p class="meta">Planning summary report · Generated ${escapeHtml(new Date().toLocaleString())}
br/>
    Officer: ${escapeHtml(doc.user?.name ?? '—')} · ${escapeHtml(doc.user?.department ?? '')}</p>
    ${img}
    <h2>Project brief</h2>
    <table>
      ${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
    </table>
    <h2>Land readiness</h2>
    <p class="note">${escapeHtml(doc.landReport?.summary ?? 'Land analysis not available for this draft.')}</p>
    ${metricBlocks ? `<h2>Analytics excerpts</h2>${metricBlocks}` : ''}
    <div class="footer">Confidential — for internal planning review · UrbanVision evidence document</div>
  </div>
</body>
</html>`;
}

export function downloadReportHtml(projectName: string, doc: ProjectReportDoc) {
  downloadBlob(pdfReportFilename(projectName), new Blob([buildReportHtml(doc)], { type: 'text/html;charset=utf-8' }));
}
