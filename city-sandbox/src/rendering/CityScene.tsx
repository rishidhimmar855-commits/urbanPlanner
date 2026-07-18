import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useCityStore } from '../store/useCityStore';
import { TerrainMesh } from './TerrainMesh';
import { BuildingsInstanced } from './BuildingsMesh';
import { RoadsMesh, SectorOutlines } from './RoadsMesh';
import { VegetationMesh } from './VegetationMesh';
import { WaterMesh } from './WaterMesh';
import { TrafficMesh, PedestriansMesh } from './TrafficMesh';
import { LODManager } from '../utils/spatialHash';
import { RenderMode } from '../types';
import { CAMERA_CONFIG } from '../core/constants';

const lodManager = new LODManager();

function SceneContent() {
  const grid = useCityStore((s) => s.grid);
  const terrainMesh = useCityStore((s) => s.terrainMesh);
  const sectors = useCityStore((s) => s.sectors);
  const roads = useCityStore((s) => s.roads);
  const buildings = useCityStore((s) => s.buildings);
  const trees = useCityStore((s) => s.trees);
  const rocks = useCityStore((s) => s.rocks);
  const vehicles = useCityStore((s) => s.vehicles);
  const pedestrians = useCityStore((s) => s.pedestrians);
  const trafficLights = useCityStore((s) => s.trafficLights);
  const renderMode = useCityStore((s) => s.renderMode);
  const selectedSectorId = useCityStore((s) => s.selectedSectorId);
  const cameraTarget = useCityStore((s) => s.cameraTarget);
  const cameraPosition = useCityStore((s) => s.cameraPosition);
  const cameraViewNonce = useCityStore((s) => s.cameraViewNonce);
  const terrainOnly = useCityStore((s) => s.terrainOnly);
  const updateSimulation = useCityStore((s) => s.updateSimulation);
  const selectSector = useCityStore((s) => s.selectSector);
  const setRenderMode = useCityStore((s) => s.setRenderMode);

  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    controlsRef.current.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    controlsRef.current.update();
  }, [camera, cameraPosition, cameraTarget, cameraViewNonce]);

  useFrame((_, delta) => {
    if (terrainOnly) return;
    updateSimulation(delta * 1000);

    const camPos = camera.position;
    const dist = Math.sqrt(camPos.x ** 2 + camPos.y ** 2 + camPos.z ** 2);
    const detail = lodManager.getDetailLevel(dist);

    if (detail === 'detail' && renderMode !== RenderMode.Detail) {
      setRenderMode(RenderMode.Detail);
    } else if (detail === 'overview' && renderMode !== RenderMode.Overview) {
      setRenderMode(RenderMode.Overview);
    }
  });

  const handleSectorClick = useCallback(
    (sectorId: number) => {
      selectSector(sectorId);
    },
    [selectSector]
  );

  if (!grid || !terrainMesh) return null;

  const isOverview = renderMode === RenderMode.Overview;
  const camDist = camera.position.length();
  const showCity = !terrainOnly;
  const showBuildings = showCity && (!isOverview || lodManager.shouldRenderBuildings(camDist));
  const showTraffic = showCity && lodManager.shouldRenderTraffic(camDist);
  const showVegetation = showCity && lodManager.shouldRenderVegetation(camDist);

  const filteredBuildings =
    selectedSectorId !== null
      ? buildings.filter((b) => b.sectorId === selectedSectorId)
      : showBuildings
        ? buildings
        : [];

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[40, 60, 25]} intensity={0.9} />
      <hemisphereLight args={['#87CEEB', '#3E2723', 0.35]} />

      <TerrainMesh data={terrainMesh} />
      <WaterMesh grid={grid} visible={true} />

      {showCity && (
        <>
          <RoadsMesh roads={roads} grid={grid} visible={true} />
          <SectorOutlines
            sectors={sectors}
            grid={grid}
            selectedSectorId={selectedSectorId}
            visible={true}
          />
          <BuildingsInstanced buildings={filteredBuildings} visible={filteredBuildings.length > 0} />
          <VegetationMesh trees={trees} rocks={rocks} visible={showVegetation} />
          <TrafficMesh vehicles={vehicles} trafficLights={trafficLights} visible={showTraffic} />
          <PedestriansMesh pedestrians={pedestrians} visible={showTraffic} />

          {sectors.map((sector) => {
            const cell = grid.getCell(Math.round(sector.center[0]), Math.round(sector.center[1]));
            if (!cell) return null;
            return (
              <mesh
                key={`click-${sector.id}`}
                position={[cell.worldPosition.x, cell.elevation + 0.2, cell.worldPosition.z]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSectorClick(sector.id);
                }}
                visible={false}
              >
                <planeGeometry args={[sector.area * 0.5, sector.area * 0.5]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            );
          })}
        </>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[800, 800]} />
        <meshToonMaterial color="#1a1a2e" />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={CAMERA_CONFIG.minDistance}
        maxDistance={CAMERA_CONFIG.maxDistance}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

function CameraRig() {
  const cameraPosition = useCityStore((s) => s.cameraPosition);
  return (
    <PerspectiveCamera
      makeDefault
      position={cameraPosition}
      fov={50}
      near={0.5}
      far={800}
    />
  );
}

export function CityScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping,
      }}
      frameloop="always"
    >
      <color attach="background" args={['#0f0f1a']} />
      <CameraRig />
      <SceneContent />
    </Canvas>
  );
}
