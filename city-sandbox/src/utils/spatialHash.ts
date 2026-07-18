export class SpatialHash<T extends { position: [number, number, number] }> {
  private cellSize: number;
  private buckets = new Map<string, T[]>();

  constructor(cellSize = 16) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  private key(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  insert(item: T): void {
    const k = this.key(item.position[0], item.position[2]);
    if (!this.buckets.has(k)) this.buckets.set(k, []);
    this.buckets.get(k)!.push(item);
  }

  queryRadius(x: number, z: number, radius: number): T[] {
    const results: T[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    for (let dz = -cellRadius; dz <= cellRadius; dz++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const bucket = this.buckets.get(`${cx + dx},${cz + dz}`);
        if (!bucket) continue;
        for (const item of bucket) {
          const dist = Math.hypot(item.position[0] - x, item.position[2] - z);
          if (dist <= radius) results.push(item);
        }
      }
    }

    return results;
  }
}

export class LODManager {
  getDetailLevel(distance: number): 'overview' | 'medium' | 'detail' {
    if (distance > 120) return 'overview';
    if (distance > 40) return 'medium';
    return 'detail';
  }

  shouldRenderBuildings(distance: number): boolean {
    return distance < 60;
  }

  shouldRenderTraffic(distance: number): boolean {
    return distance < 50;
  }

  shouldRenderVegetation(distance: number): boolean {
    return distance < 70;
  }

  getSectorLOD(distance: number): number {
    if (distance > 120) return 0;
    if (distance > 60) return 1;
    return 2;
  }
}

export function frustumCull(
  objectX: number,
  objectZ: number,
  cameraX: number,
  cameraZ: number,
  viewDistance: number
): boolean {
  const dist = Math.hypot(objectX - cameraX, objectZ - cameraZ);
  return dist <= viewDistance;
}
