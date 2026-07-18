import { useCityStore } from '../store/useCityStore';

export function LoadingScreen() {
  const progress = useCityStore((s) => s.generationProgress);
  const isGenerating = useCityStore((s) => s.isGenerating);

  if (!isGenerating || !progress) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner" />
        <h2>Generating plan options</h2>
        <p>{progress.message}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.progress * 100}%` }} />
        </div>
        <span className="progress-text">{Math.round(progress.progress * 100)}%</span>
      </div>
    </div>
  );
}
