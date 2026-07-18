import { TerrainType } from '../types';
import { classifyLandImage, classifyLegendPixel, type LandDetectMode } from './landClassify';

/** @deprecated Use classifyLegendPixel from landClassify */
export const classifyPixel = classifyLegendPixel;

export function parseTerrainImage(
  imageData: ImageData,
  maxSize: number,
  mode: LandDetectMode = 'auto'
): { terrainGrid: TerrainType[][]; width: number; height: number } {
  const result = classifyLandImage(imageData, maxSize, mode);
  return {
    terrainGrid: result.terrainGrid,
    width: result.width,
    height: result.height,
  };
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
  return createTerrainFromCoords(23.2156, 72.6369, 4, width, height);
}

/** Deterministic RNG from a numeric seed (0–1). */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoords(lat: number, lng: number): number {
  const x = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Build a planning terrain grid from geographic coordinates.
 * Lat/lng seed the landscape pattern; sizeKm maps to grid density (capped).
 */
export function createTerrainFromCoords(
  lat: number,
  lng: number,
  sizeKm = 4,
  width?: number,
  height?: number
): TerrainType[][] {
  const cells = Math.max(
    24,
    Math.min(64, width ?? Math.round(28 + sizeKm * 6))
  );
  const w = width ?? cells;
  const h = height ?? cells;
  const rand = mulberry32(Math.floor(hashCoords(lat, lng) * 1e9) ^ Math.round(lat * 1e4) ^ Math.round(lng * 1e4));

  const grid: TerrainType[][] = [];
  const cx = w / 2;
  const cy = h / 2;
  // Shift city core slightly by longitude parity for variety
  const offsetX = ((lng % 1) - 0.5) * w * 0.08;
  const offsetY = ((lat % 1) - 0.5) * h * 0.08;
  const cityHalfW = w * (0.26 + (Math.abs(lng) % 1) * 0.08);
  const cityHalfH = h * (0.26 + (Math.abs(lat) % 1) * 0.08);
  const waterAngle = hashCoords(lng, lat) * Math.PI * 2;

  for (let y = 0; y < h; y++) {
    const row: TerrainType[] = [];
    for (let x = 0; x < w; x++) {
      const dx = x - cx - offsetX;
      const dy = y - cy - offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy) / Math.max(cx, cy);
      const inCity = Math.abs(dx) < cityHalfW && Math.abs(dy) < cityHalfH;

      const wx = dx * Math.cos(waterAngle) + dy * Math.sin(waterAngle);
      const wy = -dx * Math.sin(waterAngle) + dy * Math.cos(waterAngle);
      const nearWater = wx < -cityHalfW * 0.1 && wx > -cityHalfW * 0.85 && Math.abs(wy) < h * 0.1;

      if (nearWater) {
        row.push(TerrainType.Water);
      } else if (inCity) {
        row.push(TerrainType.LowFertility);
      } else if (dist < 0.52) {
        row.push(rand() > 0.35 ? TerrainType.HighFertility : TerrainType.LowFertility);
      } else if (dist < 0.76) {
        row.push(rand() > 0.4 ? TerrainType.Forest : TerrainType.HighFertility);
      } else {
        row.push(rand() > 0.55 ? TerrainType.HighMinerals : TerrainType.Forest);
      }
    }
    grid.push(row);
  }

  return grid;
}
