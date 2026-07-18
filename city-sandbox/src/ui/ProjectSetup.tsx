import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCityStore } from '../store/useCityStore';
import { generateCity } from '../managers/ProjectManager';
import { loadImageFromFile, createSampleTerrain, parseTerrainImage } from '../utils/colorDetection';
import { MAX_GRID_SIZE, SAMPLE_GRID_SIZE } from '../core/constants';
import type { TerrainType } from '../types';

export function ProjectSetup() {
  const [projectName, setProjectName] = useState('My City');
  const [dragOver, setDragOver] = useState(false);
  const setProject = useCityStore((s) => s.setProject);
  const setGenerating = useCityStore((s) => s.setGenerating);
  const setGenerationProgress = useCityStore((s) => s.setGenerationProgress);
  const loadCity = useCityStore((s) => s.loadCity);

  const startGeneration = useCallback(
    async (terrainGrid: TerrainType[][]) => {
      setGenerating(true);
      setProject({
        id: uuidv4(),
        name: projectName,
        createdAt: Date.now(),
        gridWidth: terrainGrid[0]?.length ?? 0,
        gridHeight: terrainGrid.length,
    cellSize: 3,
      });

      try {
        const result = await generateCity(terrainGrid, setGenerationProgress);
        loadCity(result);
      } catch (err) {
        console.error('Generation failed:', err);
        setGenerating(false);
      }
    },
    [projectName, setProject, setGenerating, setGenerationProgress, loadCity]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      const imageData = await loadImageFromFile(file);
      const { terrainGrid } = parseTerrainImage(imageData, MAX_GRID_SIZE);
      await startGeneration(terrainGrid);
    },
    [startGeneration]
  );

  const handleSampleCity = useCallback(async () => {
    const terrainGrid = createSampleTerrain(SAMPLE_GRID_SIZE, SAMPLE_GRID_SIZE);
    await startGeneration(terrainGrid);
  }, [startGeneration]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  return (
    <div className="project-setup">
      <div className="setup-card">
        <div className="setup-header">
          <h1>City Sandbox</h1>
          <p>Urban planning & simulation platform</p>
        </div>

        <div className="setup-form">
          <label>
            Project Name
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter city name..."
            />
          </label>
        </div>

        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="drop-icon">🗺️</div>
          <p>Drop terrain map image here</p>
          <span className="drop-hint">
            Image colors: Green (fertility), Tan (low fertility), Brown (minerals), Blue (water), Dark green (forest)
          </span>
          <label className="upload-btn">
            Browse Files
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </label>
        </div>

        <div className="setup-divider">
          <span>or</span>
        </div>

        <button className="sample-btn" onClick={handleSampleCity}>
          Generate Sample City
        </button>

        <div className="terrain-legend">
          <h3>Terrain Color Legend</h3>
          <div className="legend-items">
            <div className="legend-item"><span className="swatch" style={{ background: '#4CAF50' }} /> High Fertility</div>
            <div className="legend-item"><span className="swatch" style={{ background: '#C8B896' }} /> Low Fertility (City)</div>
            <div className="legend-item"><span className="swatch" style={{ background: '#795548' }} /> High Minerals</div>
            <div className="legend-item"><span className="swatch" style={{ background: '#2196F3' }} /> Water</div>
            <div className="legend-item"><span className="swatch" style={{ background: '#1B5E20' }} /> Forest</div>
          </div>
        </div>
      </div>
    </div>
  );
}
