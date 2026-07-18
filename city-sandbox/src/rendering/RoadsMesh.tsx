import { useRef, useMemo, useLayoutEffect } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { RoadSegment, Sector } from '../types';
import type { GridEngine } from '../core/GridEngine';
import { ROAD_CONFIG, CELL_SIZE } from '../core/constants';
import { createRoadTileGeometry } from './geometries';

interface RoadsMeshProps {
  roads: RoadSegment[];
  grid: GridEngine;
  visible: boolean;
}

/** One toon tile per road cell — footprint matches the grid cell. */
export function RoadsMesh({ roads, grid, visible }: RoadsMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const tiles = useMemo(() => {
    if (!visible) return [];

    return roads.flatMap((road) => {
      const config = ROAD_CONFIG[road.type];
      const scale = config.width; // fraction of cell for pedestrian paths
      return road.cellIds
        .map((id) => grid.getCellById(id))
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((cell) => ({
          position: [
            cell.worldPosition.x,
            cell.elevation + config.height,
            cell.worldPosition.z,
          ] as [number, number, number],
          scale,
          color: config.color,
        }));
    });
  }, [roads, grid, visible]);

  const geometry = useMemo(() => createRoadTileGeometry(CELL_SIZE), []);

  useLayoutEffect(() => {
    if (!meshRef.current || tiles.length === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    tiles.forEach((tile, i) => {
      dummy.position.set(tile.position[0], tile.position[1], tile.position[2]);
      dummy.scale.set(tile.scale, 1, tile.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      color.set(tile.color);
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [tiles]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (!visible || tiles.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, tiles.length]} frustumCulled>
      <meshToonMaterial />
    </instancedMesh>
  );
}

interface SectorOutlinesProps {
  sectors: Sector[];
  grid: GridEngine;
  selectedSectorId: number | null;
  visible: boolean;
}

export function SectorOutlines({ sectors, grid, selectedSectorId, visible }: SectorOutlinesProps) {
  const outlines = useMemo(() => {
    if (!visible) return [];

    return sectors.map((sector) => {
      const { minX, maxX, minY, maxY } = sector.bounds;
      const corners: [number, number][] = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ];

      const points: THREE.Vector3[] = corners.map(([gx, gy]) => {
        const cell = grid.getCell(gx, gy);
        return new THREE.Vector3(
          cell?.worldPosition.x ?? gx * CELL_SIZE,
          (cell?.elevation ?? 0) + 0.25,
          cell?.worldPosition.z ?? gy * CELL_SIZE
        );
      });

      return {
        id: sector.id,
        points,
        color: sector.id === selectedSectorId ? '#FFEB3B' : sector.color,
        opacity: sector.id === selectedSectorId ? 1 : 0.65,
        lineWidth: sector.id === selectedSectorId ? 3 : 2,
      };
    });
  }, [sectors, grid, selectedSectorId, visible]);

  if (!visible) return null;

  return (
    <group>
      {outlines.map((outline) => (
        <Line
          key={outline.id}
          points={outline.points}
          color={outline.color}
          lineWidth={outline.lineWidth}
          transparent
          opacity={outline.opacity}
        />
      ))}
    </group>
  );
}
