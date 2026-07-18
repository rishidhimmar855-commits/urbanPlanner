import { useEffect, useRef, useState } from 'react';
import { compositeHeatmapOnSource } from '../../utils/sourceMapPreview';
import type { ResolvedHeatmap } from './resolveReportHeatmap';

interface Props {
  sourceDataUrl: string;
  heatmap: ResolvedHeatmap;
  className?: string;
  /** Expose latest composited canvas for download */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export function SourceHeatmapPreview({
  sourceDataUrl,
  heatmap,
  className,
  onCanvasReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onCanvasReady);
  onReadyRef.current = onCanvasReady;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        const composited = await compositeHeatmapOnSource({
          sourceDataUrl,
          heatmap: heatmap.data,
          heatWidth: heatmap.width,
          heatHeight: heatmap.height,
          maxSize: 520,
          heatAlpha: 0.58,
        });
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = composited.width;
        canvas.height = composited.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(composited, 0, 0);
        onReadyRef.current?.(composited);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Could not build map preview');
          onReadyRef.current?.(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceDataUrl, heatmap]);

  if (error) {
    return <p className="field-error">{error}</p>;
  }

  return (
    <div className={`source-heatmap-preview ${className ?? ''}`}>
      <canvas ref={canvasRef} className="source-heatmap-canvas" />
      <div className="source-heatmap-caption">
        <span>Source map</span>
        <span className="caption-sep">+</span>
        <span>Heatmap overlay</span>
      </div>
    </div>
  );
}
