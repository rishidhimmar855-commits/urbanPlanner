import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { GeoBaseData } from '../store/useCityStore';

/** Makes subtle real-world relief readable at city-sandbox scale. */
const VERTICAL_EXAGGERATION = 1.2;

interface GeoTerrainMeshProps {
  geoBase: GeoBaseData;
}

export function GeoTerrainMesh({ geoBase }: GeoTerrainMeshProps) {
  const { textureCanvas, heights, heightsSize, widthUnits, depthUnits, metersPerUnit } = geoBase;

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(textureCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [textureCanvas]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      widthUnits,
      depthUnits,
      heightsSize - 1,
      heightsSize - 1
    );
    // Lay flat: plane rows (image top first) map to -z, matching grid row 0
    geo.rotateX(-Math.PI / 2);

    let min = Infinity;
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] < min) min = heights[i];
    }

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const scale = VERTICAL_EXAGGERATION / Math.max(metersPerUnit, 1e-6);
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, (heights[i] - min) * scale);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }, [heights, heightsSize, widthUnits, depthUnits, metersPerUnit]);

  useLayoutEffect(() => {
    return () => {
      geometry.dispose();
      texture.dispose();
    };
  }, [geometry, texture]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}
