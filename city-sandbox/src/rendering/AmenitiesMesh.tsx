import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { AmenityType, type AmenityInstance } from '../types';
import { AMENITY_CONFIG, CELL_SIZE } from '../core/constants';
import {
  createCommunityGeometry,
  createHospitalGeometry,
  createMarketGeometry,
  createParkGeometry,
  createSchoolGeometry,
  createSportsGeometry,
} from './geometries';

interface AmenitiesMeshProps {
  amenities: AmenityInstance[];
  visible: boolean;
}

function AmenityLayer({
  amenities,
  geometry,
  type,
}: {
  amenities: AmenityInstance[];
  geometry: THREE.BufferGeometry;
  type: AmenityType;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = amenities.length;
  const config = AMENITY_CONFIG[type];

  useLayoutEffect(() => {
    if (!meshRef.current || count === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color(config.color);

    amenities.forEach((amenity, i) => {
      const size = CELL_SIZE * config.footprint;
      dummy.position.set(amenity.position[0], amenity.position[1], amenity.position[2]);
      dummy.scale.set(size, CELL_SIZE * config.height, size);
      dummy.rotation.set(0, amenity.rotation, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [amenities, count, config]);

  if (count === 0) return null;

  return (
    <instancedMesh
      key={`${type}-${count}`}
      ref={meshRef}
      args={[geometry, undefined, count]}
      frustumCulled
    >
      <meshToonMaterial />
    </instancedMesh>
  );
}

const GEOMETRY_FACTORIES: Record<AmenityType, () => THREE.BufferGeometry> = {
  [AmenityType.Park]: createParkGeometry,
  [AmenityType.School]: createSchoolGeometry,
  [AmenityType.Hospital]: createHospitalGeometry,
  [AmenityType.Market]: createMarketGeometry,
  [AmenityType.Community]: createCommunityGeometry,
  [AmenityType.Sports]: createSportsGeometry,
};

export function AmenitiesMesh({ amenities, visible }: AmenitiesMeshProps) {
  const geometries = useMemo(() => {
    const map = new Map<AmenityType, THREE.BufferGeometry>();
    for (const type of Object.values(AmenityType)) {
      map.set(type, GEOMETRY_FACTORIES[type]());
    }
    return map;
  }, []);

  useLayoutEffect(() => {
    return () => {
      for (const geo of geometries.values()) geo.dispose();
    };
  }, [geometries]);

  const byType = useMemo(() => {
    const groups = new Map<AmenityType, AmenityInstance[]>();
    for (const amenity of amenities) {
      const list = groups.get(amenity.type);
      if (list) list.push(amenity);
      else groups.set(amenity.type, [amenity]);
    }
    return groups;
  }, [amenities]);

  if (!visible || amenities.length === 0) return null;

  return (
    <group>
      {[...byType.entries()].map(([type, list]) => (
        <AmenityLayer key={type} type={type} amenities={list} geometry={geometries.get(type)!} />
      ))}
    </group>
  );
}
