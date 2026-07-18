import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { TerrainMeshData } from '../engines/TerrainEngine';

interface TerrainMeshProps {
  data: TerrainMeshData;
}

export function TerrainMesh({ data }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geo.setIndex(new THREE.BufferAttribute(data.indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  useLayoutEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled>
      <meshToonMaterial vertexColors side={THREE.FrontSide} />
    </mesh>
  );
}
