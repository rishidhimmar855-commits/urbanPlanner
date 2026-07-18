const TILE_SIZE = 256;

/** Esri World Imagery (satellite). Requires on-screen attribution. */
export const SATELLITE_ATTRIBUTION = 'Esri, Maxar, Earthstar Geographics';

export function satelliteTileUrl(z: number, x: number, y: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
}

/** AWS Terrain Tiles (Terrarium encoding), max useful zoom ~15. */
export function elevationTileUrl(z: number, x: number, y: number): string {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

export interface GeoBbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.min(Math.max(x, 0), n - 1),
    y: Math.min(Math.max(y, 0), n - 1),
  };
}

/** Ground resolution at latitude/zoom for 256px web-mercator tiles. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Square bbox from a center point and edge length in km. */
export function bboxFromCenter(lat: number, lng: number, edgeKm: number): GeoBbox {
  const halfMeters = (edgeKm * 1000) / 2;
  const dLat = halfMeters / 111320;
  const dLng = halfMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    south: lat - dLat,
    north: lat + dLat,
    west: lng - dLng,
    east: lng + dLng,
  };
}

function loadTileImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Tile fetch failed: ${url}`));
    img.src = url;
  });
}

export interface StitchedTiles {
  canvas: HTMLCanvasElement;
  /** Meters covered per canvas pixel at the bbox center latitude */
  metersPerPixel: number;
  zoom: number;
}

/**
 * Fetch all tiles covering the bbox at the given zoom and stitch them
 * into a single canvas (whole tiles; bbox is covered, not cropped).
 */
export async function stitchTiles(
  bbox: GeoBbox,
  zoom: number,
  urlFor: (z: number, x: number, y: number) => string
): Promise<StitchedTiles> {
  const tl = latLngToTile(bbox.north, bbox.west, zoom);
  const br = latLngToTile(bbox.south, bbox.east, zoom);

  const cols = br.x - tl.x + 1;
  const rows = br.y - tl.y + 1;
  if (cols <= 0 || rows <= 0 || cols * rows > 100) {
    throw new Error(`Unreasonable tile count (${cols}x${rows}) for zoom ${zoom}`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for tile stitching');

  await Promise.all(
    Array.from({ length: cols * rows }, (_, i) => {
      const dx = i % cols;
      const dy = Math.floor(i / cols);
      return loadTileImage(urlFor(zoom, tl.x + dx, tl.y + dy)).then((img) => {
        ctx.drawImage(img, dx * TILE_SIZE, dy * TILE_SIZE);
      });
    })
  );

  const centerLat = (bbox.north + bbox.south) / 2;
  return { canvas, metersPerPixel: metersPerPixel(centerLat, zoom), zoom };
}

/**
 * Decode a stitched Terrarium elevation canvas into a gridSize x gridSize
 * height field (meters). height = (R*256 + G + B/256) - 32768
 */
export function decodeTerrarium(canvas: HTMLCanvasElement, gridSize: number): Float32Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not read elevation canvas');
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const heights = new Float32Array(gridSize * gridSize);
  for (let gy = 0; gy < gridSize; gy++) {
    const py = Math.min(height - 1, Math.floor((gy / (gridSize - 1)) * (height - 1)));
    for (let gx = 0; gx < gridSize; gx++) {
      const px = Math.min(width - 1, Math.floor((gx / (gridSize - 1)) * (width - 1)));
      const idx = (py * width + px) * 4;
      heights[gy * gridSize + gx] =
        data[idx] * 256 + data[idx + 1] + data[idx + 2] / 256 - 32768;
    }
  }
  return heights;
}
