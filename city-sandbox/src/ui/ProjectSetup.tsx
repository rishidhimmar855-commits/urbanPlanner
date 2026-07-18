import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCityStore, type GeoBaseData } from '../store/useCityStore';
import { generateCity } from '../managers/ProjectManager';
import type { RoadLayoutPreset } from '../engines/RoadGenerator';
import { parseGeoTerrainImage } from '../utils/colorDetection';
import {
  bboxFromCenter,
  decodeTerrarium,
  elevationTileUrl,
  satelliteTileUrl,
  stitchTiles,
} from '../utils/geoTiles';
import { CELL_SIZE, MAX_GRID_SIZE } from '../core/constants';
import type { CityProject, TerrainType } from '../types';

const GEO_ZOOM = 16;
const GEO_ELEVATION_ZOOM = 14;
const GEO_HEIGHTS_SIZE = 96;

export function ProjectSetup() {
  const [projectName, setProjectName] = useState('My City');
  const [roadLayout, setRoadLayout] = useState<RoadLayoutPreset>('edges');
  // Deserted flat land in the Dholera SIR plain (~90 km south of Ahmedabad)
  const [geoLat, setGeoLat] = useState('22.2650');
  const [geoLng, setGeoLng] = useState('72.2955');
  const [geoAreaKm, setGeoAreaKm] = useState(1);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const setProject = useCityStore((s) => s.setProject);
  const setSourceMapDataUrl = useCityStore((s) => s.setSourceMapDataUrl);
  const setGeoBase = useCityStore((s) => s.setGeoBase);
  const setGenerating = useCityStore((s) => s.setGenerating);
  const setGenerationProgress = useCityStore((s) => s.setGenerationProgress);
  const loadCity = useCityStore((s) => s.loadCity);

  const startGeneration = useCallback(
    async (
      terrainGrid: TerrainType[][],
      sourceMapUrl: string,
      options?: { geo?: CityProject['geo']; geoBase?: GeoBaseData }
    ) => {
      setGenerating(true);
      setSourceMapDataUrl(sourceMapUrl);
      setGeoBase(options?.geoBase ?? null);
      setProject({
        id: uuidv4(),
        name: projectName,
        createdAt: Date.now(),
        gridWidth: terrainGrid[0]?.length ?? 0,
        gridHeight: terrainGrid.length,
        cellSize: 3,
        geo: options?.geo,
      });

      try {
        const result = await generateCity(terrainGrid, setGenerationProgress, {
          preset: roadLayout,
        });
        loadCity(result);
      } catch (err) {
        console.error('Generation failed:', err);
        setGenerating(false);
      }
    },
    [projectName, roadLayout, setProject, setSourceMapDataUrl, setGeoBase, setGenerating, setGenerationProgress, loadCity]
  );

  const handleRealLocation = useCallback(async () => {
    const lat = Number(geoLat);
    const lng = Number(geoLng);
    if (!Number.isFinite(lat) || lat < -85 || lat > 85) {
      setGeoError('Latitude must be between -85 and 85.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setGeoError('Longitude must be between -180 and 180.');
      return;
    }

    setGeoBusy(true);
    setGeoError(null);
    try {
      const bbox = bboxFromCenter(lat, lng, geoAreaKm);

      const [satellite, elevation] = await Promise.all([
        stitchTiles(bbox, GEO_ZOOM, satelliteTileUrl),
        stitchTiles(bbox, GEO_ELEVATION_ZOOM, elevationTileUrl),
      ]);

      const heights = decodeTerrarium(elevation.canvas, GEO_HEIGHTS_SIZE);

      const satCtx = satellite.canvas.getContext('2d');
      if (!satCtx) throw new Error('Could not read satellite imagery');
      const imageData = satCtx.getImageData(0, 0, satellite.canvas.width, satellite.canvas.height);
      const { terrainGrid } = parseGeoTerrainImage(imageData, MAX_GRID_SIZE);

      const gridWidth = terrainGrid[0]?.length ?? 1;
      const gridHeight = terrainGrid.length;
      const widthUnits = gridWidth * CELL_SIZE;
      const depthUnits = gridHeight * CELL_SIZE;
      const metersPerUnit = (satellite.metersPerPixel * satellite.canvas.width) / widthUnits;

      const geoBase: GeoBaseData = {
        textureCanvas: satellite.canvas,
        heights,
        heightsSize: GEO_HEIGHTS_SIZE,
        widthUnits,
        depthUnits,
        metersPerUnit,
      };

      await startGeneration(terrainGrid, satellite.canvas.toDataURL('image/png'), {
        geo: { centerLat: lat, centerLng: lng, areaKm: geoAreaKm, zoom: GEO_ZOOM },
        geoBase,
      });
    } catch (err) {
      console.error('Real location fetch failed:', err);
      setGeoError(
        err instanceof Error && err.message.includes('Tile fetch')
          ? 'Could not fetch satellite/elevation tiles. Check your internet connection and try again.'
          : 'Failed to build the real-land base. Try a different location or area size.'
      );
    } finally {
      setGeoBusy(false);
    }
  }, [geoLat, geoLng, geoAreaKm, startGeneration]);

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
          <label>
            Road Layout
            <select
              value={roadLayout}
              onChange={(e) => setRoadLayout(e.target.value as RoadLayoutPreset)}
            >
              <option value="edges">Edge roads only (urban plan)</option>
              <option value="minimal">Edges + access cross</option>
              <option value="standard">Full block grid (classic)</option>
            </select>
          </label>
          <span className="setup-hint">
            Edge roads keep arterials on sector boundaries and add internal roads only when a
            sector is too large to serve from its edges.
          </span>
        </div>

        <div className="geo-section">
          <h3>Real location (satellite)</h3>
          <p className="geo-hint">
            Fetches Esri satellite imagery and terrain elevation for real land, then builds the
            city on top.
          </p>
          <div className="geo-inputs">
            <label>
              Latitude
              <input
                type="number"
                step="0.0001"
                value={geoLat}
                onChange={(e) => setGeoLat(e.target.value)}
                disabled={geoBusy}
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="0.0001"
                value={geoLng}
                onChange={(e) => setGeoLng(e.target.value)}
                disabled={geoBusy}
              />
            </label>
            <label>
              Area
              <select
                value={geoAreaKm}
                onChange={(e) => setGeoAreaKm(Number(e.target.value))}
                disabled={geoBusy}
              >
                <option value={0.5}>0.5 km</option>
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={3}>3 km</option>
              </select>
            </label>
          </div>
          <button className="sample-btn geo-btn" onClick={handleRealLocation} disabled={geoBusy}>
            {geoBusy ? 'Fetching satellite & terrain…' : 'Fetch Real Land & Generate'}
          </button>
          {geoError && <p className="geo-error">{geoError}</p>}
        </div>

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
