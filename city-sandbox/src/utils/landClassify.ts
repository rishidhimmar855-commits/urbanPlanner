import { TerrainType } from '../types';
import { TERRAIN_COLORS, TERRAIN_REFERENCE_RGB } from '../core/constants';

export type LandDetectMode = 'auto' | 'legend' | 'photo';

export interface LandClassifyResult {
  terrainGrid: TerrainType[][];
  width: number;
  height: number;
  modeUsed: 'legend' | 'photo';
  confidence: number;
  mix: Record<TerrainType, number>;
}

/** Match flat legend-map colors to terrain types. */
export function classifyLegendPixel(r: number, g: number, b: number): TerrainType {
  let bestType = TerrainType.LowFertility;
  let bestDist = Infinity;

  for (const [type, ref] of Object.entries(TERRAIN_REFERENCE_RGB) as [
    TerrainType,
    [number, number, number],
  ][]) {
    const dr = r - ref[0];
    const dg = g - ref[1];
    const db = b - ref[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestType = type;
    }
  }

  return bestType;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function legendDistance(r: number, g: number, b: number): number {
  let best = Infinity;
  for (const ref of Object.values(TERRAIN_REFERENCE_RGB)) {
    const dr = r - ref[0];
    const dg = g - ref[1];
    const db = b - ref[2];
    best = Math.min(best, dr * dr + dg * dg + db * db);
  }
  return best;
}

/**
 * Heuristic land/soil classes from satellite-like or drone photos.
 * Maps natural colors → the same TerrainType grid the city generator already uses.
 */
export function classifyPhotoPixel(r: number, g: number, b: number): TerrainType {
  const { h, s, v } = rgbToHsv(r, g, b);

  if ((h >= 180 && h <= 250 && s > 0.18 && v > 0.2 && v < 0.92) || (b > r + 25 && b > g + 10 && b > 70)) {
    return TerrainType.Water;
  }

  if (h >= 70 && h <= 160 && s > 0.2 && v < 0.38) {
    return TerrainType.Forest;
  }

  if (h >= 70 && h <= 160 && s > 0.28 && v >= 0.38) {
    return TerrainType.HighFertility;
  }

  if (
    ((h >= 15 && h <= 50) || (h >= 0 && h < 15)) &&
    s > 0.22 &&
    v > 0.18 &&
    v < 0.72 &&
    r > g &&
    g >= b - 10
  ) {
    return TerrainType.HighMinerals;
  }

  if (s < 0.18 && v > 0.22 && v < 0.78) {
    return TerrainType.LowFertility;
  }

  if (s < 0.35 && v >= 0.55 && (h < 70 || h > 300)) {
    return TerrainType.LowFertility;
  }

  if (h >= 60 && h <= 170 && s > 0.12) {
    return v < 0.42 ? TerrainType.Forest : TerrainType.HighFertility;
  }

  return v < 0.28 ? TerrainType.Forest : TerrainType.LowFertility;
}

export function detectImageKind(imageData: ImageData): 'legend' | 'photo' {
  const { data, width, height } = imageData;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 24));
  let samples = 0;
  let legendHits = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      samples++;
      if (legendDistance(data[i], data[i + 1], data[i + 2]) < 2800) legendHits++;
    }
  }

  const ratio = samples > 0 ? legendHits / samples : 0;
  return ratio >= 0.42 ? 'legend' : 'photo';
}

function emptyMix(): Record<TerrainType, number> {
  return {
    [TerrainType.HighFertility]: 0,
    [TerrainType.LowFertility]: 0,
    [TerrainType.HighMinerals]: 0,
    [TerrainType.Water]: 0,
    [TerrainType.Forest]: 0,
  };
}

export function classifyLandImage(
  imageData: ImageData,
  maxSize: number,
  mode: LandDetectMode = 'auto'
): LandClassifyResult {
  const kind: 'legend' | 'photo' = mode === 'auto' ? detectImageKind(imageData) : mode;
  const classifier: (r: number, g: number, b: number) => TerrainType =
    kind === 'legend' ? classifyLegendPixel : classifyPhotoPixel;

  const { width: srcW, height: srcH, data } = imageData;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const width = Math.max(1, Math.floor(srcW * scale));
  const height = Math.max(1, Math.floor(srcH * scale));

  const terrainGrid: TerrainType[][] = [];
  const mix = emptyMix();
  let legendScore = 0;
  let cells = 0;

  for (let y = 0; y < height; y++) {
    const row: TerrainType[] = [];
    const srcY = Math.floor((y / height) * srcH);
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor((x / width) * srcW);
      const idx = (srcY * srcW + srcX) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const type = classifier(r, g, b);
      row.push(type);
      mix[type] += 1;
      cells += 1;
      if (legendDistance(r, g, b) < 2800) legendScore += 1;
    }
    terrainGrid.push(row);
  }

  const confidence =
    kind === 'legend'
      ? Math.round((legendScore / Math.max(cells, 1)) * 100)
      : Math.round(
          55 +
            Math.min(
              35,
              ((mix[TerrainType.Water] + mix[TerrainType.Forest]) / Math.max(cells, 1)) * 80
            )
        );

  return {
    terrainGrid,
    width,
    height,
    modeUsed: kind,
    confidence: Math.max(40, Math.min(98, confidence)),
    mix,
  };
}

export function terrainGridToDataUrl(grid: TerrainType[][], cellPx = 4): string {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  if (!w || !h) return '';

  const canvas = document.createElement('canvas');
  canvas.width = w * cellPx;
  canvas.height = h * cellPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = TERRAIN_COLORS[grid[y][x]];
      ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
    }
  }
  return canvas.toDataURL('image/png');
}

export function mixPercents(mix: Record<TerrainType, number>): Record<TerrainType, number> {
  const total = Object.values(mix).reduce((a, b) => a + b, 0) || 1;
  const out = emptyMix();
  (Object.keys(mix) as TerrainType[]).forEach((k) => {
    out[k] = Math.round((mix[k] / total) * 1000) / 10;
  });
  return out;
}

/**
 * Synthetic satellite-style landscape for demos (no drone file needed).
 * Returns ImageData that the photo classifier can read.
 */
export function createDemoSatelliteImage(size = 256): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create demo image');

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#3d6b2f');
  g.addColorStop(0.35, '#6fa84a');
  g.addColorStop(0.55, '#c4b896');
  g.addColorStop(0.75, '#8b7355');
  g.addColorStop(1, '#2a4a22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Water body
  ctx.fillStyle = '#2a7ab8';
  ctx.beginPath();
  ctx.ellipse(size * 0.22, size * 0.55, size * 0.18, size * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Dense forest patch
  ctx.fillStyle = '#1a3d18';
  ctx.beginPath();
  ctx.ellipse(size * 0.72, size * 0.28, size * 0.2, size * 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Built / bare soil plateau
  ctx.fillStyle = '#b8a888';
  ctx.fillRect(size * 0.38, size * 0.4, size * 0.36, size * 0.32);

  // Rocky fringe
  ctx.fillStyle = '#6b4e3a';
  ctx.beginPath();
  ctx.ellipse(size * 0.82, size * 0.78, size * 0.14, size * 0.1, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Soft noise
  const img = ctx.getImageData(0, 0, size, size);
  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  return img;
}
