import type { AnalyticsReport, Sector } from '../../types';
import { ReportType, TerrainType } from '../../types';
import { TERRAIN_COLORS } from '../../core/constants';

/** Easy-to-edit thresholds */
export const REPORT_THRESHOLDS = {
  congestedTraffic: 60,
  cleanPollution: 30,
};

export interface OverlayKpi {
  label: string;
  value: string;
}

export type OverlayVisualKind =
  | { kind: 'heatmap'; data: Float32Array; width: number; height: number }
  | { kind: 'bars'; items: { label: string; value: number; color?: string }[]; max?: number }
  | { kind: 'shares'; items: { label: string; value: number; color: string }[] }
  | { kind: 'meter'; value: number; max: number; color: string; label?: string }
  | { kind: 'split'; left: { label: string; value: number; color: string }; right: { label: string; value: number; color: string } };

export interface OverlayLegend {
  lowLabel: string;
  highLabel: string;
  gradient?: 'heat' | 'pollution' | 'water' | 'power' | 'forest';
  swatches?: { label: string; color: string }[];
}

export interface ReportOverlayModel {
  title: string;
  kpis: OverlayKpi[];
  insight?: string;
  legend?: OverlayLegend;
  visualA: OverlayVisualKind;
  visualB: OverlayVisualKind;
  visualALabel: string;
  visualBLabel: string;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(n: number): string {
  return `${fmt(n, 1)}%`;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function topN<T>(
  items: T[],
  getValue: (item: T) => number,
  n: number,
  desc = true
): T[] {
  return [...items]
    .sort((a, b) => (desc ? getValue(b) - getValue(a) : getValue(a) - getValue(b)))
    .slice(0, n);
}

function sectorBars(
  items: { id: number; value: number }[],
  color = '#4fc3f7'
): OverlayVisualKind {
  return {
    kind: 'bars',
    items: items.map((i) => ({
      label: `S${i.id}`,
      value: i.value,
      color,
    })),
  };
}

function intensityFromValues(values: number[]): OverlayVisualKind {
  const n = Math.max(values.length, 1);
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const data = new Float32Array(cols * rows);
  for (let i = 0; i < values.length; i++) data[i] = values[i];
  return { kind: 'heatmap', data, width: cols, height: rows };
}

export function buildReportOverlayModel(
  report: AnalyticsReport,
  sectors: Sector[]
): ReportOverlayModel {
  const data = report.data;

  switch (report.type) {
    case ReportType.Population: {
      const totalPop = sectors.reduce((a, s) => a + s.simulationData.population, 0);
      const max = Number(data.max ?? 1);
      const sectorCount = Number(data.sectors ?? sectors.length);
      const densest = topN(
        sectors.map((s) => ({
          id: s.id,
          value: s.area > 0 ? s.simulationData.population / s.area : 0,
        })),
        (x) => x.value,
        5
      );
      return {
        title: report.title,
        kpis: [
          { label: 'Total population', value: fmt(totalPop, 0) },
          { label: 'Peak density', value: fmt(max) },
          { label: 'Sectors', value: fmt(sectorCount, 0) },
          densest[0]
            ? { label: 'Hottest sector', value: `S${densest[0].id} (${fmt(densest[0].value)})` }
            : { label: 'Hottest sector', value: '—' },
        ],
        insight: 'Darker/warmer cells indicate higher population density.',
        legend: { lowLabel: 'Low', highLabel: 'High', gradient: 'heat' },
        visualA:
          report.heatmap && report.heatmapWidth && report.heatmapHeight
            ? {
                kind: 'heatmap',
                data: report.heatmap,
                width: report.heatmapWidth,
                height: report.heatmapHeight,
              }
            : intensityFromValues(densest.map((d) => d.value)),
        visualB: sectorBars(densest, '#ef5350'),
        visualALabel: 'City heatmap',
        visualBLabel: 'Top densest sectors',
      };
    }

    case ReportType.Traffic: {
      const rows = asArray<{ id: number; traffic: number; vehicles: number }>(data.sectors);
      const average = Number(data.average ?? 0);
      const peak = topN(rows, (r) => r.traffic, 1)[0];
      const totalVehicles = rows.reduce((a, r) => a + (r.vehicles ?? 0), 0);
      const congested = rows.filter((r) => r.traffic >= REPORT_THRESHOLDS.congestedTraffic).length;
      const top = topN(rows, (r) => r.traffic, 5);
      return {
        title: report.title,
        kpis: [
          { label: 'Avg traffic', value: fmt(average) },
          { label: 'Peak sector', value: peak ? `S${peak.id} (${fmt(peak.traffic)})` : '—' },
          { label: 'Total vehicles', value: fmt(totalVehicles, 0) },
          { label: 'Congested sectors', value: fmt(congested, 0) },
        ],
        insight: `Congested if traffic ≥ ${REPORT_THRESHOLDS.congestedTraffic}.`,
        legend: { lowLabel: 'Low', highLabel: 'High traffic', gradient: 'heat' },
        visualA: intensityFromValues(rows.map((r) => r.traffic)),
        visualB: sectorBars(
          top.map((t) => ({ id: t.id, value: t.traffic })),
          '#ffa726'
        ),
        visualALabel: 'Traffic intensity',
        visualBLabel: 'Top congested',
      };
    }

    case ReportType.RoadUsage: {
      const byType = (data.byType ?? {}) as Record<string, number>;
      const totalRoads = Number(data.totalRoads ?? 0);
      const totalCells = Number(data.totalCells ?? 0) || 1;
      const primary = byType.primary ?? 0;
      const secondary = byType.secondary ?? 0;
      const pedestrian = byType.pedestrian ?? 0;
      const shareItems = [
        { label: 'Primary', value: primary, color: '#ffca28' },
        { label: 'Secondary', value: secondary, color: '#90a4ae' },
        { label: 'Pedestrian', value: pedestrian, color: '#81c784' },
      ].filter((i) => i.value > 0);
      return {
        title: report.title,
        kpis: [
          { label: 'Road segments', value: fmt(totalRoads, 0) },
          { label: 'Road cells', value: fmt(Number(data.totalCells ?? 0), 0) },
          { label: 'Primary share', value: pct((primary / totalCells) * 100) },
          { label: 'Secondary share', value: pct((secondary / totalCells) * 100) },
          { label: 'Pedestrian share', value: pct((pedestrian / totalCells) * 100) },
        ],
        legend: {
          lowLabel: 'Type',
          highLabel: 'Share',
          swatches: shareItems.map((i) => ({ label: i.label, color: i.color })),
        },
        visualA: { kind: 'shares', items: shareItems },
        visualB: {
          kind: 'bars',
          items: shareItems.map((i) => ({
            label: i.label.slice(0, 3),
            value: (i.value / totalCells) * 100,
            color: i.color,
          })),
        },
        visualALabel: 'Road type mix',
        visualBLabel: 'Share %',
      };
    }

    case ReportType.Pollution: {
      const rows = asArray<{ id: number; pollution: number }>(data.sectors);
      const average = Number(data.average ?? 0);
      const worst = topN(rows, (r) => r.pollution, 1)[0];
      const clean = rows.filter((r) => r.pollution < REPORT_THRESHOLDS.cleanPollution).length;
      const worst3 = topN(rows, (r) => r.pollution, 3);
      return {
        title: report.title,
        kpis: [
          { label: 'Average', value: fmt(average) },
          { label: 'Worst sector', value: worst ? `S${worst.id} (${fmt(worst.pollution)})` : '—' },
          { label: 'Clean sectors', value: fmt(clean, 0) },
        ],
        insight: `Clean if pollution < ${REPORT_THRESHOLDS.cleanPollution}.`,
        legend: { lowLabel: 'Clean', highLabel: 'Polluted', gradient: 'pollution' },
        visualA: intensityFromValues(rows.map((r) => r.pollution)),
        visualB: sectorBars(
          worst3.map((w) => ({ id: w.id, value: w.pollution })),
          '#ef5350'
        ),
        visualALabel: 'Pollution map',
        visualBLabel: 'Worst sectors',
      };
    }

    case ReportType.WaterUsage: {
      const rows = asArray<{ id: number; usage: number }>(data.perSector);
      const total = Number(data.total ?? 0);
      const avg = rows.length ? total / rows.length : 0;
      const top = topN(rows, (r) => r.usage, 5);
      const peak = top[0];
      return {
        title: report.title,
        kpis: [
          { label: 'Total usage', value: fmt(total) },
          { label: 'Avg / sector', value: fmt(avg) },
          { label: 'Highest sector', value: peak ? `S${peak.id} (${fmt(peak.usage)})` : '—' },
        ],
        legend: { lowLabel: 'Low', highLabel: 'High', gradient: 'water' },
        visualA: intensityFromValues(rows.map((r) => r.usage)),
        visualB: sectorBars(
          top.map((t) => ({ id: t.id, value: t.usage })),
          '#29b6f6'
        ),
        visualALabel: 'Usage intensity',
        visualBLabel: 'Top consumers',
      };
    }

    case ReportType.Electricity: {
      const rows = asArray<{ id: number; usage: number }>(data.perSector);
      const total = Number(data.total ?? 0);
      const avg = rows.length ? total / rows.length : 0;
      const top = topN(rows, (r) => r.usage, 5);
      const peak = top[0];
      return {
        title: report.title,
        kpis: [
          { label: 'Total load', value: fmt(total) },
          { label: 'Avg / sector', value: fmt(avg) },
          { label: 'Peak sector', value: peak ? `S${peak.id} (${fmt(peak.usage)})` : '—' },
        ],
        legend: { lowLabel: 'Low', highLabel: 'High', gradient: 'power' },
        visualA: intensityFromValues(rows.map((r) => r.usage)),
        visualB: sectorBars(
          top.map((t) => ({ id: t.id, value: t.usage })),
          '#ffca28'
        ),
        visualALabel: 'Load intensity',
        visualBLabel: 'Top load sectors',
      };
    }

    case ReportType.ForestCoverage: {
      const coverage = Number(data.coverage ?? 0);
      const forestCells = Number(data.forestCells ?? 0);
      const nonForest = Math.max(0, 100 - coverage);
      return {
        title: report.title,
        kpis: [
          { label: 'Forest cover', value: pct(coverage) },
          { label: 'Forest cells', value: fmt(forestCells, 0) },
          { label: 'Other land', value: pct(nonForest) },
        ],
        legend: {
          lowLabel: 'Forest',
          highLabel: 'Other',
          gradient: 'forest',
          swatches: [
            { label: 'Forest', color: TERRAIN_COLORS[TerrainType.Forest] },
            { label: 'Other', color: '#546e7a' },
          ],
        },
        visualA: {
          kind: 'split',
          left: { label: 'Forest', value: coverage, color: TERRAIN_COLORS[TerrainType.Forest] },
          right: { label: 'Other', value: nonForest, color: '#546e7a' },
        },
        visualB: {
          kind: 'meter',
          value: coverage,
          max: 100,
          color: TERRAIN_COLORS[TerrainType.Forest],
          label: 'Coverage',
        },
        visualALabel: 'Forest vs other',
        visualBLabel: 'Coverage meter',
      };
    }

    case ReportType.LandUsage: {
      const usage = (data.usage ?? {}) as Record<string, number>;
      const total = Number(data.total ?? 1) || 1;
      const entries = Object.entries(usage).map(([key, value]) => ({
        key,
        value,
        pct: (value / total) * 100,
        color: TERRAIN_COLORS[key as TerrainType] ?? '#9898b0',
      }));
      const dominant = topN(entries, (e) => e.value, 1)[0];
      const getPct = (t: TerrainType) => ((usage[t] ?? 0) / total) * 100;
      return {
        title: report.title,
        kpis: [
          {
            label: 'Dominant',
            value: dominant ? `${formatTerrain(dominant.key)} (${pct(dominant.pct)})` : '—',
          },
          { label: 'Water', value: pct(getPct(TerrainType.Water)) },
          { label: 'Forest', value: pct(getPct(TerrainType.Forest)) },
          { label: 'Residential land', value: pct(getPct(TerrainType.LowFertility)) },
        ],
        legend: {
          lowLabel: 'Terrain',
          highLabel: 'Share',
          swatches: entries.map((e) => ({
            label: formatTerrain(e.key),
            color: e.color,
          })),
        },
        visualA: {
          kind: 'bars',
          items: entries.map((e) => ({
            label: shortTerrain(e.key),
            value: e.pct,
            color: e.color,
          })),
        },
        visualB: {
          kind: 'shares',
          items: entries.map((e) => ({
            label: formatTerrain(e.key),
            value: e.value,
            color: e.color,
          })),
        },
        visualALabel: 'Terrain share %',
        visualBLabel: 'Land mix',
      };
    }

    case ReportType.BuildingDensity: {
      const rows = asArray<{ id: number; buildings: number; density: number; area: number }>(
        data.sectors
      );
      const totalBuildings = rows.reduce((a, r) => a + r.buildings, 0);
      const avgDensity = rows.length
        ? rows.reduce((a, r) => a + r.density, 0) / rows.length
        : 0;
      const top = topN(rows, (r) => r.density, 5);
      const densest = top[0];
      return {
        title: report.title,
        kpis: [
          { label: 'Total buildings', value: fmt(totalBuildings, 0) },
          { label: 'Avg density', value: fmt(avgDensity) },
          {
            label: 'Densest sector',
            value: densest ? `S${densest.id} (${fmt(densest.density)})` : '—',
          },
        ],
        legend: { lowLabel: 'Low', highLabel: 'High', gradient: 'heat' },
        visualA: intensityFromValues(rows.map((r) => r.density)),
        visualB: sectorBars(
          top.map((t) => ({ id: t.id, value: t.density })),
          '#ab47bc'
        ),
        visualALabel: 'Density map',
        visualBLabel: 'Top densest',
      };
    }

    case ReportType.SectorComparison: {
      const rows = asArray<{
        id: number;
        population: number;
        happiness: number;
        income: number;
      }>(data.sectors);
      const bestHappy = topN(rows, (r) => r.happiness, 1)[0];
      const bestPop = topN(rows, (r) => r.population, 1)[0];
      const bestIncome = topN(rows, (r) => r.income, 1)[0];
      const topPop = topN(rows, (r) => r.population, 5);
      const topHappy = topN(rows, (r) => r.happiness, 5);
      return {
        title: report.title,
        kpis: [
          {
            label: 'Best happiness',
            value: bestHappy ? `S${bestHappy.id} (${fmt(bestHappy.happiness, 0)}%)` : '—',
          },
          {
            label: 'Highest population',
            value: bestPop ? `S${bestPop.id} (${fmt(bestPop.population, 0)})` : '—',
          },
          {
            label: 'Highest income',
            value: bestIncome ? `S${bestIncome.id} (${fmt(bestIncome.income, 0)})` : '—',
          },
        ],
        insight: 'Compare population vs happiness across leading sectors.',
        visualA: sectorBars(
          topPop.map((t) => ({ id: t.id, value: t.population })),
          '#4fc3f7'
        ),
        visualB: sectorBars(
          topHappy.map((t) => ({ id: t.id, value: t.happiness })),
          '#66bb6a'
        ),
        visualALabel: 'Top by population',
        visualBLabel: 'Top by happiness',
      };
    }

    case ReportType.GrowthTrends: {
      const totalPopulation = Number(data.totalPopulation ?? 0);
      const totalEmployment = Number(data.totalEmployment ?? 0);
      const avgHappiness = Number(data.avgHappiness ?? 0);
      const sectorCount = Number(data.sectorCount ?? 0);
      const ratio = totalPopulation > 0 ? (totalEmployment / totalPopulation) * 100 : 0;
      return {
        title: report.title,
        kpis: [
          { label: 'Population', value: fmt(totalPopulation, 0) },
          { label: 'Employment', value: fmt(totalEmployment, 0) },
          { label: 'Avg happiness', value: pct(avgHappiness) },
          { label: 'Sectors', value: fmt(sectorCount, 0) },
          { label: 'Jobs / pop', value: pct(ratio) },
        ],
        insight: `Employment ratio: ${pct(ratio)}.`,
        visualA: {
          kind: 'bars',
          items: [
            { label: 'Pop', value: totalPopulation, color: '#4fc3f7' },
            { label: 'Jobs', value: totalEmployment, color: '#ffa726' },
          ],
        },
        visualB: {
          kind: 'meter',
          value: avgHappiness,
          max: 100,
          color: '#66bb6a',
          label: 'Happiness',
        },
        visualALabel: 'Pop vs jobs',
        visualBLabel: 'Happiness',
      };
    }

    default:
      return {
        title: report.title,
        kpis: [{ label: 'Status', value: 'No overlay mapping' }],
        visualA: { kind: 'bars', items: [] },
        visualB: { kind: 'bars', items: [] },
        visualALabel: 'A',
        visualBLabel: 'B',
      };
  }
}

function formatTerrain(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortTerrain(key: string): string {
  const map: Record<string, string> = {
    [TerrainType.HighFertility]: 'Fert',
    [TerrainType.LowFertility]: 'City',
    [TerrainType.HighMinerals]: 'Mine',
    [TerrainType.Water]: 'H2O',
    [TerrainType.Forest]: 'For',
  };
  return map[key] ?? key.slice(0, 3);
}
