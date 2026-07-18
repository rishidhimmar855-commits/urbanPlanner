import type { AnalyticsReport, Sector } from '../../types';
import { ReportType, TerrainType } from '../../types';
import type { GridEngine } from '../../core/GridEngine';

export interface ResolvedHeatmap {
  data: Float32Array;
  width: number;
  height: number;
}

function paintSectorValues(
  grid: GridEngine,
  sectors: Sector[],
  getValue: (sector: Sector) => number
): ResolvedHeatmap {
  const width = grid.width;
  const height = grid.height;
  const data = new Float32Array(width * height);

  for (const sector of sectors) {
    const value = getValue(sector);
    for (const cellId of sector.cellIds) {
      const cell = grid.getCellById(cellId);
      if (cell) data[cell.gridY * width + cell.gridX] = value;
    }
  }

  return { data, width, height };
}

/** Build a grid-aligned heatmap for reports that can sit on the source map. */
export function resolveReportHeatmap(
  report: AnalyticsReport,
  sectors: Sector[],
  grid: GridEngine | null
): ResolvedHeatmap | null {
  if (
    report.type === ReportType.Population &&
    report.heatmap &&
    report.heatmapWidth &&
    report.heatmapHeight
  ) {
    return {
      data: report.heatmap,
      width: report.heatmapWidth,
      height: report.heatmapHeight,
    };
  }

  if (!grid) return null;

  switch (report.type) {
    case ReportType.Traffic:
      return paintSectorValues(grid, sectors, (s) => s.simulationData.traffic);
    case ReportType.Pollution:
      return paintSectorValues(grid, sectors, (s) => s.simulationData.pollution);
    case ReportType.WaterUsage:
      return paintSectorValues(grid, sectors, (s) => s.simulationData.waterUsage);
    case ReportType.Electricity:
      return paintSectorValues(grid, sectors, (s) => s.simulationData.electricity);
    case ReportType.BuildingDensity: {
      const counts = new Map<number, number>();
      // density proxy from report data if present
      const rows = Array.isArray(report.data.sectors)
        ? (report.data.sectors as { id: number; density: number }[])
        : [];
      for (const row of rows) counts.set(row.id, row.density);
      return paintSectorValues(grid, sectors, (s) => counts.get(s.id) ?? 0);
    }
    case ReportType.ForestCoverage:
      return paintTerrainMask(grid, (t) => (t === TerrainType.Forest ? 1 : 0));
    case ReportType.LandUsage:
      // Show residential-capable land highlight
      return paintTerrainMask(grid, (t) => (t === TerrainType.LowFertility ? 1 : 0));
    default:
      return null;
  }
}

function paintTerrainMask(
  grid: GridEngine,
  match: (terrainType: TerrainType) => number
): ResolvedHeatmap {
  const width = grid.width;
  const height = grid.height;
  const data = new Float32Array(width * height);
  const cells = grid.getAllCells();
  for (const cell of cells) {
    data[cell.gridY * width + cell.gridX] = match(cell.terrainType);
  }
  return { data, width, height };
}

export function reportSupportsSourceHeatmap(type: ReportType): boolean {
  return (
    type === ReportType.Population ||
    type === ReportType.Traffic ||
    type === ReportType.Pollution ||
    type === ReportType.WaterUsage ||
    type === ReportType.Electricity ||
    type === ReportType.BuildingDensity ||
    type === ReportType.ForestCoverage ||
    type === ReportType.LandUsage
  );
}
