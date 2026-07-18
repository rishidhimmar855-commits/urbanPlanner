import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { GridEngine } from '../core/GridEngine';
import { TerrainType } from '../types';
import { CELL_SIZE } from '../core/constants';

interface WaterMeshProps {
  grid: GridEngine;
  visible: boolean;
}

export function WaterMesh({ grid, visible }: WaterMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const waterCells = useMemo(() => {
    if (!visible) return [];
    return grid.getCellsByTerrain(TerrainType.Water);
  }, [grid, visible]);

  const geometry = useMemo(() => new THREE.BoxGeometry(CELL_SIZE * 0.95, 0.2, CELL_SIZE * 0.95), []);

  useLayoutEffect(() => {
    if (!meshRef.current || waterCells.length === 0) return;
    const dummy = new THREE.Object3D();

    waterCells.forEach((cell, i) => {
      dummy.position.set(cell.worldPosition.x, cell.elevation - 0.05, cell.worldPosition.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [waterCells]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (!visible || waterCells.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, waterCells.length]} frustumCulled>
      <meshToonMaterial color="#1565C0" transparent opacity={0.8} />
    </instancedMesh>
  );
}
