import type { Sector, SimulationData } from '../types';
import { SECTOR_DENSITY_CONFIG } from '../core/constants';

export class SimulationEngine {
  private tick = 0;

  initializeSectors(sectors: Sector[]): void {
    for (const sector of sectors) {
      const config = SECTOR_DENSITY_CONFIG[sector.density];
      sector.simulationData.vehicles =
        config.vehicleCount[0] +
        Math.floor(Math.random() * (config.vehicleCount[1] - config.vehicleCount[0]));
      sector.simulationData.traffic = Math.random() * 100;
      sector.simulationData.pollution = Math.random() * 50;
      sector.simulationData.electricity = sector.simulationData.population * (0.5 + Math.random());
      sector.simulationData.waterUsage = sector.simulationData.population * (0.3 + Math.random() * 0.2);
      sector.simulationData.waste = sector.simulationData.population * 0.1;
      sector.simulationData.happiness = 40 + Math.random() * 50;
    }
  }

  update(sectors: Sector[], deltaTime: number): void {
    this.tick += deltaTime;

    for (const sector of sectors) {
      const growth = (Math.random() - 0.48) * 0.5;
      sector.simulationData.population = Math.max(
        0,
        Math.floor(sector.simulationData.population * (1 + growth * 0.001))
      );

      sector.simulationData.traffic = Math.max(
        0,
        Math.min(100, sector.simulationData.traffic + (Math.random() - 0.5) * 2)
      );

      sector.simulationData.pollution = Math.max(
        0,
        Math.min(100, sector.simulationData.pollution + (Math.random() - 0.5) * 0.5)
      );

      sector.simulationData.electricity =
        sector.simulationData.population * (0.4 + Math.sin(this.tick * 0.001) * 0.1);
      sector.simulationData.waterUsage =
        sector.simulationData.population * (0.25 + Math.cos(this.tick * 0.0015) * 0.05);

      const trafficFactor = sector.simulationData.traffic / 100;
      sector.simulationData.happiness = Math.max(
        0,
        Math.min(
          100,
          sector.simulationData.happiness - trafficFactor * 0.1 + (Math.random() - 0.5) * 0.2
        )
      );
    }
  }

  aggregateStats(sectors: Sector[]): SimulationData {
    const total: SimulationData = {
      population: 0,
      employment: 0,
      vehicles: 0,
      pollution: 0,
      traffic: 0,
      electricity: 0,
      waterUsage: 0,
      waste: 0,
      happiness: 0,
      averageIncome: 0,
    };

    for (const sector of sectors) {
      total.population += sector.simulationData.population;
      total.employment += sector.simulationData.employment;
      total.vehicles += sector.simulationData.vehicles;
      total.pollution += sector.simulationData.pollution;
      total.traffic += sector.simulationData.traffic;
      total.electricity += sector.simulationData.electricity;
      total.waterUsage += sector.simulationData.waterUsage;
      total.waste += sector.simulationData.waste;
      total.happiness += sector.simulationData.happiness;
      total.averageIncome += sector.simulationData.averageIncome;
    }

    const count = sectors.length || 1;
    total.pollution /= count;
    total.traffic /= count;
    total.happiness /= count;
    total.averageIncome /= count;

    return total;
  }
}
