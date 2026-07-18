import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vehicle, Pedestrian, TrafficLight } from '../types';
import { createCarGeometry, createPersonGeometry } from './geometries';

interface TrafficMeshProps {
  vehicles: Vehicle[];
  trafficLights: TrafficLight[];
  visible: boolean;
}

export function TrafficMesh({ vehicles, trafficLights, visible }: TrafficMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const color = useRef(new THREE.Color());
  const carGeo = useMemo(() => createCarGeometry(), []);

  useLayoutEffect(() => {
    if (!meshRef.current || vehicles.length === 0) return;
    vehicles.forEach((vehicle, i) => {
      color.current.set(vehicle.color);
      meshRef.current!.setColorAt(i, color.current);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [vehicles]);

  useLayoutEffect(() => () => carGeo.dispose(), [carGeo]);

  useFrame(() => {
    if (!meshRef.current || !visible || vehicles.length === 0) return;
    const d = dummy.current;
    vehicles.forEach((vehicle, i) => {
      d.position.set(vehicle.position[0], vehicle.position[1], vehicle.position[2]);
      d.rotation.y = vehicle.rotation;
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      meshRef.current!.setMatrixAt(i, d.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!visible || vehicles.length === 0) return null;

  return (
    <group>
      <instancedMesh ref={meshRef} args={[carGeo, undefined, vehicles.length]} frustumCulled>
        <meshToonMaterial />
      </instancedMesh>

      {trafficLights.map((light) => (
        <group key={light.id} position={light.position}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.08, 1.6, 0.08]} />
            <meshToonMaterial color="#37474F" />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[0.22, 0.4, 0.12]} />
            <meshToonMaterial
              color={
                light.state === 'red' ? '#F44336' : light.state === 'green' ? '#4CAF50' : '#FFEB3B'
              }
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface PedestriansMeshProps {
  pedestrians: Pedestrian[];
  visible: boolean;
}

export function PedestriansMesh({ pedestrians, visible }: PedestriansMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());
  const personGeo = useMemo(() => createPersonGeometry(), []);

  useLayoutEffect(() => () => personGeo.dispose(), [personGeo]);

  useFrame(() => {
    if (!meshRef.current || !visible || pedestrians.length === 0) return;
    const d = dummy.current;
    pedestrians.forEach((ped, i) => {
      d.position.set(ped.position[0], ped.position[1], ped.position[2]);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      meshRef.current!.setMatrixAt(i, d.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!visible || pedestrians.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[personGeo, undefined, pedestrians.length]} frustumCulled>
      <meshToonMaterial color="#FF9800" />
    </instancedMesh>
  );
}
