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

/**
 * Classifier tuned for real satellite photos (not hand-drawn maps).
 * Real land is mostly buildable: only clear water and strong vegetation
 * are carved out, so the city generator gets a usable canvas.
 */
export function classifyGeoPixel(r: number, g: number, b: number): TerrainType {
  const brightness = (r + g + b) / 3;

  // Water: blue-dominant or very dark (rivers, sea, lakes)
  if (b > r + 12 && b > g + 6 && b > 60) return TerrainType.Water;
  if (brightness < 40 && b >= r) return TerrainType.Water;

  // Dense vegetation: strongly green and dark
  if (g > r + 18 && g > b + 18 && g > 60 && brightness < 110) return TerrainType.Forest;

  // Moderate vegetation / crops: greenish
  if (g > r + 10 && g > b + 14) return TerrainType.HighFertility;

  // Everything else (barren, scrub, built-up, sand) is buildable land
  return TerrainType.LowFertility;
}

function parseImageWith(
  imageData: ImageData,
  maxSize: number,
  classify: (r: number, g: number, b: number) => TerrainType
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
      row.push(classify(data[idx], data[idx + 1], data[idx + 2]));
    }
    terrainGrid.push(row);
  }

  return { terrainGrid, width, height };
}

export function parseTerrainImage(
  imageData: ImageData,
  maxSize: number
): { terrainGrid: TerrainType[][]; width: number; height: number } {
  return parseImageWith(imageData, maxSize, classifyPixel);
}

/** Parse a real satellite image into terrain, biased toward buildable land. */
export function parseGeoTerrainImage(
  imageData: ImageData,
  maxSize: number
): { terrainGrid: TerrainType[][]; width: number; height: number } {
  return parseImageWith(imageData, maxSize, classifyGeoPixel);
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
