import { GridEngine } from '../core/GridEngine';
import { ROAD_CONFIG, SECTOR_DENSITY_CONFIG, SECTOR_PLAN } from '../core/constants';
import { RoadType, TerrainType, type RoadSegment, type Sector } from '../types';
import type { CityPlan } from './SectorGenerator';
import type { Cell } from '../core/Cell';

let nextRoadId = 0;

type RoadMask = Map<string, RoadType>;

/**
 * Gandhinagar-style road network:
 * 1) Primary arterials on the planned macro-grid (sector boundaries)
 * 2) Secondary / pedestrian grid inside each rectangular sector
 * 3) Optional diagonal boulevard across the city AABB
 */
export class RoadGenerator {
  private grid: GridEngine;
  private mask: RoadMask = new Map();

  constructor(grid: GridEngine) {
    this.grid = grid;
  }

  private key(x: number, y: number): string {
    return `${x},${y}`;
  }

  private parseKey(k: string): [number, number] {
    const [x, y] = k.split(',').map(Number);
    return [x, y];
  }

  private isWalkable(x: number, y: number): boolean {
    const cell = this.grid.getCell(x, y);
    return !!cell && cell.terrainType !== TerrainType.Water;
  }

  private mark(x: number, y: number, type: RoadType): void {
    if (!this.isWalkable(x, y)) return;
    const k = this.key(x, y);
    const existing = this.mask.get(k);
    if (!existing || priority(type) >= priority(existing)) {
      this.mask.set(k, type);
    }
  }

  generate(plan: CityPlan): RoadSegment[] {
    nextRoadId = 0;
    this.mask.clear();

    this.paintArterials(plan);
    for (const sector of plan.sectors) {
      this.paintSectorInterior(sector);
    }
    this.paintDiagonalBoulevard(plan);
    this.fillLocalGaps();

    return this.maskToSegments(plan.sectors);
  }

  /** Primary roads: full arterial columns/rows across the planned city. */
  private paintArterials(plan: CityPlan): void {
    const { minX, maxX, minY, maxY } = plan.cityBounds;

    for (const ax of plan.arterialXs) {
      for (let y = minY; y <= maxY; y++) {
        this.mark(ax, y, RoadType.Primary);
      }
    }

    for (const ay of plan.arterialYs) {
      for (let x = minX; x <= maxX; x++) {
        this.mark(x, ay, RoadType.Primary);
      }
    }
  }

  /** Secondary block grid + light pedestrian stubs inside a sector parcel. */
  private paintSectorInterior(sector: Sector): void {
    const { minX, maxX, minY, maxY } = sector.bounds;
    const block =
      SECTOR_DENSITY_CONFIG[sector.density].blockSize || SECTOR_PLAN.internalBlock;

    const midX = Math.floor((minX + maxX) / 2);
    const midY = Math.floor((minY + maxY) / 2);

    // Internal cross (secondary) — connects to arterials at sector edges
    for (let x = minX; x <= maxX; x++) this.mark(x, midY, RoadType.Secondary);
    for (let y = minY; y <= maxY; y++) this.mark(midX, y, RoadType.Secondary);

    // Finer block grid
    for (let x = minX + block; x < maxX; x += block) {
      if (x === midX) continue;
      for (let y = minY; y <= maxY; y++) this.mark(x, y, RoadType.Secondary);
    }
    for (let y = minY + block; y < maxY; y += block) {
      if (y === midY) continue;
      for (let x = minX; x <= maxX; x++) this.mark(x, y, RoadType.Secondary);
    }

    // Sparse pedestrian alleys in high/medium density
    if (sector.density !== 'low') {
      for (let y = minY + 1; y < maxY; y += block) {
        for (let x = minX + 1; x < maxX; x += block) {
          if (Math.random() > 0.45) continue;
          this.mark(x, y, RoadType.Pedestrian);
          if (x + 1 <= maxX) this.mark(x + 1, y, RoadType.Pedestrian);
        }
      }
    }
  }

  /** One diagonal primary (like a ceremonial boulevard) across the plan. */
  private paintDiagonalBoulevard(plan: CityPlan): void {
    const { minX, maxX, minY, maxY } = plan.cityBounds;
    const w = maxX - minX;
    const h = maxY - minY;
    if (w < 8 || h < 8) return;

    const steps = Math.max(w, h);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(minX + t * w);
      const y = Math.round(minY + t * h);
      this.mark(x, y, RoadType.Primary);
      // Slight width so it reads as a boulevard
      if (this.isWalkable(x + 1, y)) this.mark(x + 1, y, RoadType.Primary);
    }
  }

  private fillLocalGaps(): void {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let changed = true;
    let guard = 0;
    while (changed && guard++ < 3) {
      changed = false;
      for (const k of [...this.mask.keys()]) {
        const [x, y] = this.parseKey(k);
        for (const [dx, dy] of dirs) {
          const mx = x + dx;
          const my = y + dy;
          const ox = x + dx * 2;
          const oy = y + dy * 2;
          if (
            this.mask.has(this.key(ox, oy)) &&
            !this.mask.has(this.key(mx, my)) &&
            this.isWalkable(mx, my)
          ) {
            this.mark(mx, my, RoadType.Secondary);
            changed = true;
          }
        }
      }
    }
  }

  private maskToSegments(sectors: Sector[]): RoadSegment[] {
    const sectorAt = new Map<string, number>();
    for (const sector of sectors) {
      for (const id of sector.cellIds) {
        const cell = this.grid.getCellById(id);
        if (cell) sectorAt.set(this.key(cell.gridX, cell.gridY), sector.id);
      }
    }

    for (const [k] of this.mask) {
      const [x, y] = this.parseKey(k);
      const cell = this.grid.getCell(x, y);
      if (cell) cell.roadId = -1;
    }

    const visited = new Set<string>();
    const segments: RoadSegment[] = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (const startK of this.mask.keys()) {
      if (visited.has(startK)) continue;

      const component: string[] = [];
      const q = [startK];
      visited.add(startK);

      while (q.length > 0) {
        const cur = q.pop()!;
        component.push(cur);
        const [cx, cy] = this.parseKey(cur);
        for (const [dx, dy] of dirs) {
          const nk = this.key(cx + dx, cy + dy);
          if (!this.mask.has(nk) || visited.has(nk)) continue;
          visited.add(nk);
          q.push(nk);
        }
      }

      const remaining = new Set(component);
      while (remaining.size > 0) {
        const seed = remaining.values().next().value as string;
        const run = this.extractAxisRun(seed, remaining);
        if (run.length < 1) {
          remaining.delete(seed);
          continue;
        }

        const cells = run
          .map((k) => {
            const [x, y] = this.parseKey(k);
            return this.grid.getCell(x, y);
          })
          .filter((c): c is Cell => c !== null);

        if (cells.length === 0) continue;

        let runType = RoadType.Pedestrian;
        for (const k of run) {
          const t = this.mask.get(k)!;
          if (priority(t) > priority(runType)) runType = t;
        }

        const id = nextRoadId++;
        for (const c of cells) c.roadId = id;

        const [sx, sy] = this.parseKey(run[0]);
        const [ex, ey] = this.parseKey(run[run.length - 1]);
        const sectorIds = new Set<number>();
        for (const k of run) {
          const sid = sectorAt.get(k);
          if (sid !== undefined) sectorIds.add(sid);
        }

        segments.push({
          id,
          type: runType,
          cellIds: cells.map((c) => c.id),
          start: [sx, sy],
          end: [ex, ey],
          width: ROAD_CONFIG[runType].width,
          connectedSectorIds: [...sectorIds],
          hasTrafficLight:
            runType === RoadType.Primary && cells.length > 8 && Math.random() > 0.88,
        });
      }
    }

    return segments;
  }

  private extractAxisRun(seed: string, remaining: Set<string>): string[] {
    if (!remaining.has(seed)) return [];
    const [sx, sy] = this.parseKey(seed);

    const expand = (dx: number, dy: number): string[] => {
      const run = [seed];
      let x = sx + dx;
      let y = sy + dy;
      while (remaining.has(this.key(x, y))) {
        run.push(this.key(x, y));
        x += dx;
        y += dy;
      }
      x = sx - dx;
      y = sy - dy;
      while (remaining.has(this.key(x, y))) {
        run.unshift(this.key(x, y));
        x -= dx;
        y -= dy;
      }
      return run;
    };

    const h = expand(1, 0);
    const v = expand(0, 1);
    const run = h.length >= v.length ? h : v;
    for (const k of run) remaining.delete(k);
    return run;
  }

  getRoadWorldPath(road: RoadSegment): [number, number, number][] {
    return road.cellIds
      .map((id) => {
        const cell = this.grid.getCellById(id);
        if (!cell) return null;
        return [cell.worldPosition.x, cell.elevation + 0.1, cell.worldPosition.z] as [
          number,
          number,
          number,
        ];
      })
      .filter((p): p is [number, number, number] => p !== null);
  }
}

function priority(type: RoadType): number {
  switch (type) {
    case RoadType.Primary:
    case RoadType.Intersection:
    case RoadType.Roundabout:
      return 3;
    case RoadType.Secondary:
      return 2;
    case RoadType.Pedestrian:
      return 1;
    default:
      return 0;
  }
}
