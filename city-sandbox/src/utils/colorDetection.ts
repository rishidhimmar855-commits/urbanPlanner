import { TerrainType } from '../types';
import { TERRAIN_REFERENCE_RGB } from '../core/constants';

export function classifyPixel(r: number, g: number, b: number): TerrainType {
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

export function parseTerrainImage(
  imageData: ImageData,
  maxSize: number
): { terrainGrid: TerrainType[][]; width: number; height: number } {
  const { width: srcW, height: srcH, data } = imageData;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const width = Math.max(1, Math.floor(srcW * scale));
  const height = Math.max(1, Math.floor(srcH * scale));

  const terrainGrid: TerrainType[][] = [];

  for (let y = 0; y < height; y++) {
    const row: TerrainType[] = [];
    const srcY = Math.floor((y / height) * srcH);
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor((x / width) * srcW);
      const idx = (srcY * srcW + srcX) * 4;
      row.push(classifyPixel(data[idx], data[idx + 1], data[idx + 2]));
    }
    terrainGrid.push(row);
  }

  return { terrainGrid, width, height };
}

export async function loadImageFromFile(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Planned-city sample: large rectangular low-fertility plateau for
 * Gandhinagar-style sectors, with water/forest/minerals as fringe.
 */
export function createSampleTerrain(width: number, height: number): TerrainType[][] {
  const grid: TerrainType[][] = [];
  const cx = width / 2;
  const cy = height / 2;
  const cityHalfW = width * 0.32;
  const cityHalfH = height * 0.32;

  for (let y = 0; y < height; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(cx, cy);
      const inCity = Math.abs(dx) < cityHalfW && Math.abs(dy) < cityHalfH;

      // Lake just west of the planned city plateau
      if (dx < -cityHalfW * 0.15 && dx > -cityHalfW * 0.7 && Math.abs(dy) < height * 0.08) {
        row.push(TerrainType.Water);
      } else if (inCity) {
        row.push(TerrainType.LowFertility);
      } else if (dist < 0.55) {
        row.push(Math.random() > 0.35 ? TerrainType.HighFertility : TerrainType.LowFertility);
      } else if (dist < 0.78) {
        row.push(Math.random() > 0.4 ? TerrainType.Forest : TerrainType.HighFertility);
      } else {
        row.push(Math.random() > 0.55 ? TerrainType.HighMinerals : TerrainType.Forest);
      }
    }
    grid.push(row);
  }

  return grid;
}
