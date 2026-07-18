import type { GridEngine } from '../core/GridEngine';
import type { Sector, RoadSegment, Building, AnalyticsReport } from '../types';
import { ReportType, TerrainType } from '../types';

export class AnalyticsEngine {
  private grid: GridEngine;

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  generateAllReports(sectors: Sector[], roads: RoadSegment[], buildings: Building[]): AnalyticsReport[] {
    return [
      this.populationHeatmap(sectors),
      this.trafficDensity(sectors),
      this.roadUsage(roads, sectors),
      this.pollutionReport(sectors),
      this.waterUsageReport(sectors),
      this.electricityReport(sectors),
      this.forestCoverage(),
      this.landUsage(),
      this.buildingDensity(sectors, buildings),
      this.sectorComparison(sectors),
      this.growthTrends(sectors),
    ];
  }

  private populationHeatmap(sectors: Sector[]): AnalyticsReport {
    const w = this.grid.width;
    const h = this.grid.height;
    const heatmap = new Float32Array(w * h);

    for (const sector of sectors) {
      const pop = sector.simulationData.population;
      for (const cellId of sector.cellIds) {
        const cell = this.grid.getCellById(cellId);
        if (cell) {
          heatmap[cell.gridY * w + cell.gridX] = pop / sector.area;
        }
      }
    }

    return {
      type: ReportType.Population,
      title: 'Population Heatmap',
      data: { max: Math.max(...heatmap, 1), sectors: sectors.length },
      heatmap,
      heatmapWidth: w,
      heatmapHeight: h,
    };
  }

  private trafficDensity(sectors: Sector[]): AnalyticsReport {
    const values = sectors.map((s) => ({
      id: s.id,
      density: s.density,
      traffic: s.simulationData.traffic,
      vehicles: s.simulationData.vehicles,
    }));

    return {
      type: ReportType.Traffic,
      title: 'Traffic Density',
      data: { sectors: values, average: values.reduce((a, v) => a + v.traffic, 0) / (values.length || 1) },
    };
  }

  private roadUsage(roads: RoadSegment[], _sectors: Sector[]): AnalyticsReport {
    const byType: Record<string, number> = {};
    for (const road of roads) {
      byType[road.type] = (byType[road.type] ?? 0) + road.cellIds.length;
    }

    return {
      type: ReportType.RoadUsage,
      title: 'Road Usage',
      data: { byType, totalRoads: roads.length, totalCells: roads.reduce((a, r) => a + r.cellIds.length, 0) },
    };
  }

  private pollutionReport(sectors: Sector[]): AnalyticsReport {
    return {
      type: ReportType.Pollution,
      title: 'Pollution Levels',
      data: {
        sectors: sectors.map((s) => ({ id: s.id, pollution: s.simulationData.pollution, density: s.density })),
        average: sectors.reduce((a, s) => a + s.simulationData.pollution, 0) / (sectors.length || 1),
      },
    };
  }

  private waterUsageReport(sectors: Sector[]): AnalyticsReport {
    return {
      type: ReportType.WaterUsage,
      title: 'Water Usage',
      data: {
        total: sectors.reduce((a, s) => a + s.simulationData.waterUsage, 0),
        perSector: sectors.map((s) => ({ id: s.id, usage: s.simulationData.waterUsage })),
      },
    };
  }

  private electricityReport(sectors: Sector[]): AnalyticsReport {
    return {
      type: ReportType.Electricity,
      title: 'Electricity Consumption',
      data: {
        total: sectors.reduce((a, s) => a + s.simulationData.electricity, 0),
        perSector: sectors.map((s) => ({ id: s.id, usage: s.simulationData.electricity })),
      },
    };
  }

  private forestCoverage(): AnalyticsReport {
    const cells = this.grid.getAllCells();
    const forest = cells.filter((c) => c.terrainType === TerrainType.Forest).length;
    return {
      type: ReportType.ForestCoverage,
      title: 'Forest Coverage',
      data: { coverage: (forest / cells.length) * 100, forestCells: forest, totalCells: cells.length },
    };
  }

  private landUsage(): AnalyticsReport {
    const cells = this.grid.getAllCells();
    const usage: Record<string, number> = {};
    for (const cell of cells) {
      usage[cell.terrainType] = (usage[cell.terrainType] ?? 0) + 1;
    }
    return {
      type: ReportType.LandUsage,
      title: 'Land Usage',
      data: { usage, total: cells.length },
    };
  }

  private buildingDensity(sectors: Sector[], buildings: Building[]): AnalyticsReport {
    return {
      type: ReportType.BuildingDensity,
      title: 'Building Density',
      data: {
        sectors: sectors.map((s) => ({
          id: s.id,
          buildings: buildings.filter((b) => b.sectorId === s.id).length,
          area: s.area,
          density: buildings.filter((b) => b.sectorId === s.id).length / s.area,
        })),
      },
    };
  }

  private sectorComparison(sectors: Sector[]): AnalyticsReport {
    return {
      type: ReportType.SectorComparison,
      title: 'Sector Comparison',
      data: {
        sectors: sectors.map((s) => ({
          id: s.id,
          density: s.density,
          population: s.simulationData.population,
          happiness: s.simulationData.happiness,
          income: s.simulationData.averageIncome,
          area: s.area,
        })),
      },
    };
  }

  private growthTrends(sectors: Sector[]): AnalyticsReport {
    return {
      type: ReportType.GrowthTrends,
      title: 'Growth Trends',
      data: {
        totalPopulation: sectors.reduce((a, s) => a + s.simulationData.population, 0),
        totalEmployment: sectors.reduce((a, s) => a + s.simulationData.employment, 0),
        avgHappiness: sectors.reduce((a, s) => a + s.simulationData.happiness, 0) / (sectors.length || 1),
        sectorCount: sectors.length,
      },
    };
  }
}
