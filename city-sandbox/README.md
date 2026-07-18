# City Sandbox

A modular web-based city planning and simulation platform inspired by Cities: Skylines. Upload a terrain map image and procedurally generate an explorable low-poly city with sectors, roads, buildings, traffic, pedestrians, and live analytics.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **3D Rendering:** Three.js, React Three Fiber, Mesh Toon Material
- **State:** Zustand, React Query
- **Performance:** InstancedMesh, LOD, Frustum Culling, Spatial Hashing, Web Workers

## Getting Started

```bash
cd city-sandbox
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Usage

1. **Create a project** — Enter a city name on the landing page.
2. **Upload terrain map** — Drop an image with these terrain colors, or click "Generate Sample City":
   - Green `#4CAF50` — High Fertility
   - Tan `#C8B896` — Low Fertility (becomes city sectors)
   - Brown `#795548` — High Minerals (mountains)
   - Blue `#2196F3` — Water
   - Dark Green `#1B5E20` — Forest
3. **Explore** — Orbit/zoom the 3D city. Overview mode shows terrain, sectors, and roads. Zoom in for buildings, traffic, and pedestrians.
4. **Select sectors** — Click a sector to view statistics and highlight it.
5. **Reports** — Open the analytics panel for population heatmaps, traffic, pollution, and more.

## Architecture

```
src/
├── core/           Cell, GridEngine, constants
├── engines/        Terrain, Sector, Road, Building, Vegetation, Traffic, Pedestrian, Simulation
├── analytics/      AnalyticsEngine, report generation
├── rendering/      R3F scene, instanced meshes, LOD
├── managers/       ProjectManager (generation pipeline)
├── store/          Zustand state
├── ui/             Project setup, toolbar, panels
├── utils/          Color detection, spatial hash, LOD
└── workers/        Web Worker for image parsing
```

## Camera Modes

| Mode | Distance | Renders |
|------|----------|---------|
| Overview | > 120 units | Terrain, sectors, roads, water |
| Detail | < 40 units | Buildings, vehicles, pedestrians, trees |

## Performance

- Buildings, trees, rocks, vehicles, and pedestrians use `InstancedMesh`
- LOD manager switches detail based on camera distance
- Spatial hashing for proximity queries
- Chunk-based sector rendering
- Web Worker offloads terrain image parsing

## Future Backend

Planned Node.js + Express/NestJS + PostgreSQL backend for project persistence, multiplayer, and server-side simulation.
