import type { TerrainType } from '../types';
import { TERRAIN_REFERENCE_RGB } from '../core/constants';
import type { OverlayKpi, OverlayLegend } from '../ui/reports/reportOverlayModel';

export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Render a terrain grid as an RGB source map (for sample cities). */
export function terrainGridToDataUrl(grid: TerrainType[][]): string {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!width || !height) return '';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const type = grid[y][x];
      const [r, g, b] = TERRAIN_REFERENCE_RGB[type];
      const idx = (y * width + x) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  // Upscale for readable preview
  const scale = Math.max(1, Math.floor(512 / Math.max(width, height)));
  if (scale <= 1) return canvas.toDataURL('image/png');

  const out = document.createElement('canvas');
  out.width = width * scale;
  out.height = height * scale;
  const outCtx = out.getContext('2d');
  if (!outCtx) return canvas.toDataURL('image/png');
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

function heatRgba(t: number, alpha: number): [number, number, number, number] {
  const r = Math.floor(t * 255);
  const g = Math.floor((1 - t) * 80 + t * 40);
  const b = Math.floor((1 - t) * 255);
  return [r, g, b, alpha];
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load source map'));
    img.src = src;
  });
}

export interface CompositeOptions {
  sourceDataUrl: string;
  heatmap: Float32Array;
  heatWidth: number;
  heatHeight: number;
  /** Output max edge length */
  maxSize?: number;
  heatAlpha?: number;
}

/** Draw heatmap tinted over the source terrain image. */
export async function compositeHeatmapOnSource(options: CompositeOptions): Promise<HTMLCanvasElement> {
  const { sourceDataUrl, heatmap, heatWidth, heatHeight, maxSize = 640, heatAlpha = 0.55 } = options;
  const img = await loadImage(sourceDataUrl);

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);

  const max = Math.max(...heatmap, 1e-6);
  const heatCanvas = document.createElement('canvas');
  heatCanvas.width = heatWidth;
  heatCanvas.height = heatHeight;
  const heatCtx = heatCanvas.getContext('2d');
  if (!heatCtx) return canvas;

  const imageData = heatCtx.createImageData(heatWidth, heatHeight);
  for (let i = 0; i < heatmap.length; i++) {
    const v = heatmap[i];
    const t = v / max;
    const [r, g, b, a] = heatRgba(t, v > 0 ? Math.round(255 * heatAlpha) : 0);
    const idx = i * 4;
    imageData.data[idx] = r;
    imageData.data[idx + 1] = g;
    imageData.data[idx + 2] = b;
    imageData.data[idx + 3] = a;
  }
  heatCtx.putImageData(imageData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(heatCanvas, 0, 0, w, h);
  return canvas;
}

export interface ReportPreviewExportInput {
  title: string;
  projectName: string;
  kpis: OverlayKpi[];
  insight?: string;
  legend?: OverlayLegend;
  /** Pre-composited map canvas (source + heatmap) or null */
  mapCanvas: HTMLCanvasElement | null;
  secondaryNote?: string;
}

/** Build a self-contained PNG preview: map + KPIs + legend (readable without 3D). */
export function buildDownloadableReportPreview(input: ReportPreviewExportInput): HTMLCanvasElement {
  const pad = 24;
  const mapW = input.mapCanvas?.width ?? 480;
  const mapH = input.mapCanvas?.height ?? 280;
  const contentW = Math.max(480, mapW);
  const kpiRows = Math.ceil(input.kpis.length / 2);
  const headerH = 72;
  const kpiH = 28 + kpiRows * 36;
  const insightH = input.insight ? 36 : 0;
  const legendH = 40;
  const footerH = 28;
  const totalH = pad + headerH + mapH + 16 + kpiH + insightH + legendH + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = contentW + pad * 2;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let y = pad;
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 20px Segoe UI, sans-serif';
  ctx.fillText(input.title, pad, y + 22);
  ctx.fillStyle = '#9898b0';
  ctx.font = '13px Segoe UI, sans-serif';
  ctx.fillText(`${input.projectName} · Static preview (no 3D required)`, pad, y + 44);
  y += headerH;

  const mapX = pad + Math.floor((contentW - mapW) / 2);
  if (input.mapCanvas) {
    ctx.drawImage(input.mapCanvas, mapX, y, mapW, mapH);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(mapX, y, mapW, mapH);
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(pad, y, contentW, mapH);
    ctx.fillStyle = '#9898b0';
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillText('No map preview for this report type', pad + 16, y + mapH / 2);
  }
  y += mapH + 16;

  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 13px Segoe UI, sans-serif';
  ctx.fillText('Key metrics', pad, y);
  y += 18;

  const colW = contentW / 2;
  input.kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = pad + col * colW;
    const ky = y + row * 36;
    ctx.fillStyle = '#9898b0';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText(kpi.label, x, ky);
    ctx.fillStyle = '#e8e8f0';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    ctx.fillText(kpi.value, x, ky + 18);
  });
  y += kpiRows * 36 + 10;

  if (input.insight) {
    ctx.fillStyle = '#b0b0c8';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(input.insight, pad, y);
    y += insightH;
  }

  // Legend bar
  if (input.legend) {
    ctx.fillStyle = '#9898b0';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText(input.legend.lowLabel, pad, y + 14);
    const gradX = pad + 40;
    const gradW = contentW - 100;
    const gradient = ctx.createLinearGradient(gradX, 0, gradX + gradW, 0);
    gradient.addColorStop(0, '#1936ff');
    gradient.addColorStop(0.45, '#64b5f6');
    gradient.addColorStop(0.75, '#ff7043');
    gradient.addColorStop(1, '#ff1744');
    ctx.fillStyle = gradient;
    ctx.fillRect(gradX, y + 4, gradW, 12);
    ctx.fillStyle = '#9898b0';
    ctx.fillText(input.legend.highLabel, gradX + gradW + 8, y + 14);
    y += legendH;
  }

  ctx.fillStyle = '#6a6a80';
  ctx.font = '10px Segoe UI, sans-serif';
  ctx.fillText(
    input.secondaryNote ?? 'Heatmap overlaid on source terrain map · City Sandbox report preview',
    pad,
    canvas.height - 12
  );

  return canvas;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}

export function downloadTextFile(content: string, filename: string, mime = 'text/markdown') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
