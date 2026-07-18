import { useEffect, useRef } from 'react';
import type { OverlayVisualKind } from './reportOverlayModel';

const THUMB_W = 160;
const THUMB_H = 96;

function heatColor(t: number, alpha = 200): [number, number, number, number] {
  const r = Math.floor(t * 255);
  const g = Math.floor((1 - t) * 100);
  const b = Math.floor((1 - t) * 255);
  return [r, g, b, alpha];
}

function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number
) {
  const max = Math.max(...data, 1e-6);
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < data.length; i++) {
    const t = data[i] / max;
    const [r, g, b, a] = heatColor(t, data[i] > 0 ? 220 : 30);
    const idx = i * 4;
    imageData.data[idx] = r;
    imageData.data[idx + 1] = g;
    imageData.data[idx + 2] = b;
    imageData.data[idx + 3] = a;
  }
  // Draw into offscreen then scale to thumb
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, THUMB_W, THUMB_H);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, THUMB_W, THUMB_H);
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  items: { label: string; value: number; color?: string }[],
  maxValue?: number
) {
  ctx.clearRect(0, 0, THUMB_W, THUMB_H);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  if (items.length === 0) {
    ctx.fillStyle = '#9898b0';
    ctx.font = '11px Segoe UI, sans-serif';
    ctx.fillText('No data', 12, 52);
    return;
  }

  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1e-6);
  const pad = 8;
  const labelW = 28;
  const gap = 4;
  const barH = Math.min(14, (THUMB_H - pad * 2 - gap * (items.length - 1)) / items.length);
  const barMaxW = THUMB_W - pad * 2 - labelW;

  items.forEach((item, i) => {
    const y = pad + i * (barH + gap);
    ctx.fillStyle = '#9898b0';
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.fillText(item.label, pad, y + barH - 2);
    const w = (item.value / max) * barMaxW;
    ctx.fillStyle = item.color ?? '#4fc3f7';
    ctx.fillRect(pad + labelW, y, Math.max(2, w), barH);
  });
}

function drawShares(
  ctx: CanvasRenderingContext2D,
  items: { label: string; value: number; color: string }[]
) {
  ctx.clearRect(0, 0, THUMB_W, THUMB_H);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const y = 28;
  const h = 28;
  const x0 = 10;
  const w = THUMB_W - 20;
  let x = x0;
  for (const item of items) {
    const seg = (item.value / total) * w;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, Math.max(1, seg), h);
    x += seg;
  }

  ctx.font = '9px Segoe UI, sans-serif';
  let lx = 10;
  for (const item of items.slice(0, 4)) {
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, 70, 8, 8);
    ctx.fillStyle = '#c8c8d8';
    ctx.fillText(item.label.slice(0, 8), lx + 11, 78);
    lx += 38;
  }
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  value: number,
  max: number,
  color: string,
  label?: string
) {
  ctx.clearRect(0, 0, THUMB_W, THUMB_H);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  const t = Math.min(1, Math.max(0, value / (max || 1)));
  ctx.fillStyle = '#9898b0';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.fillText(label ?? 'Value', 12, 28);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(12, 42, THUMB_W - 24, 18);
  ctx.fillStyle = color;
  ctx.fillRect(12, 42, (THUMB_W - 24) * t, 18);

  ctx.fillStyle = '#e8e8f0';
  ctx.font = '12px Segoe UI, sans-serif';
  ctx.fillText(`${(t * 100).toFixed(1)}%`, 12, 80);
}

function drawSplit(
  ctx: CanvasRenderingContext2D,
  left: { label: string; value: number; color: string },
  right: { label: string; value: number; color: string }
) {
  ctx.clearRect(0, 0, THUMB_W, THUMB_H);
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  const total = left.value + right.value || 1;
  const leftW = (left.value / total) * (THUMB_W - 20);
  ctx.fillStyle = left.color;
  ctx.fillRect(10, 30, leftW, 36);
  ctx.fillStyle = right.color;
  ctx.fillRect(10 + leftW, 30, THUMB_W - 20 - leftW, 36);

  ctx.font = '10px Segoe UI, sans-serif';
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText(`${left.label} ${left.value.toFixed(1)}%`, 12, 82);
  ctx.fillText(`${right.label} ${right.value.toFixed(1)}%`, 90, 82);
}

function paint(ctx: CanvasRenderingContext2D, visual: OverlayVisualKind) {
  switch (visual.kind) {
    case 'heatmap':
      drawHeatmap(ctx, visual.data, visual.width, visual.height);
      break;
    case 'bars':
      drawBars(ctx, visual.items, visual.max);
      break;
    case 'shares':
      drawShares(ctx, visual.items);
      break;
    case 'meter':
      drawMeter(ctx, visual.value, visual.max, visual.color, visual.label);
      break;
    case 'split':
      drawSplit(ctx, visual.left, visual.right);
      break;
  }
}

export function ReportThumb({
  visual,
  label,
}: {
  visual: OverlayVisualKind;
  label: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = THUMB_W;
    canvas.height = THUMB_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paint(ctx, visual);
  }, [visual]);

  return (
    <div className="report-thumb">
      <canvas ref={ref} className="report-thumb-canvas" width={THUMB_W} height={THUMB_H} />
      <span className="report-thumb-label">{label}</span>
    </div>
  );
}

/** Shared heatmap thumb for reuse (population full grid). */
export function HeatmapThumb({
  data,
  width,
  height,
  label = 'Heatmap',
}: {
  data: Float32Array;
  width: number;
  height: number;
  label?: string;
}) {
  return <ReportThumb visual={{ kind: 'heatmap', data, width, height }} label={label} />;
}
