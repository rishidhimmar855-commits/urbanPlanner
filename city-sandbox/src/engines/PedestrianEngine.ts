import type { Pedestrian, Building, RoadSegment } from '../types';

let nextPedestrianId = 0;

export class PedestrianEngine {
  private pedestrians: Pedestrian[] = [];

  generate(buildings: Building[], _roads: RoadSegment[], sectors: { id: number; density: string }[]): Pedestrian[] {
    nextPedestrianId = 0;
    this.pedestrians = [];

    for (const sector of sectors) {
      const sectorBuildings = buildings.filter((b) => b.sectorId === sector.id);
      if (sectorBuildings.length < 2) continue;

      const count = sector.density === 'high' ? 8 : sector.density === 'medium' ? 5 : 3;

      for (let i = 0; i < count; i++) {
        const source = sectorBuildings[Math.floor(Math.random() * sectorBuildings.length)];
        let target = sectorBuildings[Math.floor(Math.random() * sectorBuildings.length)];
        while (target.id === source.id && sectorBuildings.length > 1) {
          target = sectorBuildings[Math.floor(Math.random() * sectorBuildings.length)];
        }

        this.pedestrians.push({
          id: nextPedestrianId++,
          position: [source.position[0], source.position[1] + 0.05, source.position[2]],
          sourceBuildingId: source.id,
          targetBuildingId: target.id,
          progress: Math.random(),
          speed: 0.005 + Math.random() * 0.01,
        });
      }
    }

    return this.pedestrians;
  }

  update(buildings: Building[], _deltaTime: number): void {
    const buildingMap = new Map(buildings.map((b) => [b.id, b]));

    for (const ped of this.pedestrians) {
      const source = buildingMap.get(ped.sourceBuildingId);
      const target = buildingMap.get(ped.targetBuildingId);
      if (!source || !target) continue;

      ped.progress += ped.speed;
      if (ped.progress >= 1) {
        ped.progress = 0;
        ped.sourceBuildingId = ped.targetBuildingId;
        const sectorBuildings = buildings.filter((b) => b.sectorId === target.sectorId);
        const newTarget = sectorBuildings[Math.floor(Math.random() * sectorBuildings.length)];
        if (newTarget) ped.targetBuildingId = newTarget.id;
      }

      const t = ped.progress;
      const src = buildingMap.get(ped.sourceBuildingId)!;
      const tgt = buildingMap.get(ped.targetBuildingId)!;

      ped.position[0] = src.position[0] + (tgt.position[0] - src.position[0]) * t;
      ped.position[1] = src.position[1] + (tgt.position[1] - src.position[1]) * t + 0.05;
      ped.position[2] = src.position[2] + (tgt.position[2] - src.position[2]) * t;
    }
  }

  getPedestrians(): Pedestrian[] {
    return this.pedestrians;
  }
}
