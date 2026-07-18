import type { TerrainType } from '../types';

export interface WorkerProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface WorkerResult {
  terrainGrid: TerrainType[][];
  width: number;
  height: number;
}

self.onmessage = (e: MessageEvent<{ type: string; imageData?: ImageData; maxSize?: number }>) => {
  if (e.data.type === 'parseImage' && e.data.imageData && e.data.maxSize) {
    const { imageData, maxSize } = e.data;
    const result = parseTerrainInWorker(imageData, maxSize);
    self.postMessage({ type: 'complete', result });
  }
};

const TERRAIN_REF: [string, [number, number, number]][] = [
  ['high_fertility', [76, 175, 80]],
  ['low_fertility', [200, 184, 150]],
  ['high_minerals', [121, 85, 72]],
  ['water', [33, 150, 243]],
  ['forest', [27, 94, 32]],
];

function classifyPixel(r: number, g: number, b: number): string {
  let bestType = 'low_fertility';
  let bestDist = Infinity;
  for (const [type, ref] of TERRAIN_REF) {
    const dr = r - ref[0], dg = g - ref[1], db = b - ref[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestType = type;
    }
  }
  return bestType;
}

function parseTerrainInWorker(imageData: ImageData, maxSize: number): WorkerResult {
  const { width: srcW, height: srcH, data } = imageData;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const width = Math.max(1, Math.floor(srcW * scale));
  const height = Math.max(1, Math.floor(srcH * scale));
  const terrainGrid: string[][] = [];

  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    const srcY = Math.floor((y / height) * srcH);
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor((x / width) * srcW);
      const idx = (srcY * srcW + srcX) * 4;
      row.push(classifyPixel(data[idx], data[idx + 1], data[idx + 2]));
    }
    terrainGrid.push(row);
  }

  return { terrainGrid: terrainGrid as TerrainType[][], width, height };
}
