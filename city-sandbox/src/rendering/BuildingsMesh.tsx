import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { BuildingType, type Building } from '../types';
import {
  createApartmentGeometry,
  createHouseGeometry,
  createTowerGeometry,
} from './geometries';

interface BuildingsInstancedProps {
  buildings: Building[];
  visible: boolean;
}

function BuildingLayer({
  buildings,
  geometry,
}: {
  buildings: Building[];
  geometry: THREE.BufferGeometry;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = buildings.length;

  useLayoutEffect(() => {
    if (!meshRef.current || count === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    buildings.forEach((building, i) => {
      dummy.position.set(building.position[0], building.position[1], building.position[2]);
      dummy.scale.set(building.width, building.height, building.depth);
      dummy.rotation.set(0, ((building.id % 4) * Math.PI) / 2, 0);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      color.set(building.color);
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [buildings, count]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled>
      <meshToonMaterial />
    </instancedMesh>
  );
}

export function BuildingsInstanced({ buildings, visible }: BuildingsInstancedProps) {
  const houseGeo = useMemo(() => createHouseGeometry(), []);
  const aptGeo = useMemo(() => createApartmentGeometry(), []);
  const towerGeo = useMemo(() => createTowerGeometry(), []);

  const houses = useMemo(
    () => buildings.filter((b) => b.type === BuildingType.House),
    [buildings]
  );
  const apartments = useMemo(
    () => buildings.filter((b) => b.type === BuildingType.Apartment),
    [buildings]
  );
  const towers = useMemo(
    () =>
      buildings.filter(
        (b) =>
          b.type === BuildingType.Tower ||
          b.type === BuildingType.Commercial ||
          b.type === BuildingType.Hospital ||
          b.type === BuildingType.School ||
          b.type === BuildingType.BusStand ||
          b.type === BuildingType.Railway ||
          b.type === BuildingType.Market
      ),
    [buildings]
  );
  const parks = useMemo(
    () => buildings.filter((b) => b.type === BuildingType.Park),
    [buildings]
  );

  useLayoutEffect(() => {
    return () => {
      houseGeo.dispose();
      aptGeo.dispose();
      towerGeo.dispose();
    };
  }, [houseGeo, aptGeo, towerGeo]);

  if (!visible) return null;

  return (
    <group>
      <BuildingLayer buildings={houses} geometry={houseGeo} />
      <BuildingLayer buildings={apartments} geometry={aptGeo} />
      <BuildingLayer buildings={towers} geometry={towerGeo} />
      <BuildingLayer buildings={parks} geometry={houseGeo} />
    </group>
  );
}
