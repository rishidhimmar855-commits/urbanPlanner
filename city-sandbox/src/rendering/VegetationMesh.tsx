import { useRef, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { TreeInstance, RockInstance } from '../types';

interface VegetationMeshProps {
  trees: TreeInstance[];
  rocks: RockInstance[];
  visible: boolean;
}

/** Fully instanced trees + rocks — no per-tree mesh draw calls. */
export function VegetationMesh({ trees, rocks, visible }: VegetationMeshProps) {
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);

  const canopyGeo = useMemo(() => new THREE.ConeGeometry(0.55, 1.1, 5), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.12, 0.16, 0.7, 5), []);
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(0.4, 0), []);

  useLayoutEffect(() => {
    if (!canopyRef.current || !trunkRef.current || trees.length === 0) return;
    const dummy = new THREE.Object3D();

    trees.forEach((tree, i) => {
      dummy.position.set(tree.position[0], tree.position[1] + tree.scale * 0.35, tree.position[2]);
      dummy.scale.set(tree.scale * 0.35, tree.scale * 0.7, tree.scale * 0.35);
      dummy.rotation.y = tree.rotation;
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.position[0], tree.position[1] + tree.scale * 1.0, tree.position[2]);
      dummy.scale.set(tree.scale * 0.85, tree.scale * 0.7, tree.scale * 0.85);
      dummy.updateMatrix();
      canopyRef.current!.setMatrixAt(i, dummy.matrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    canopyRef.current.instanceMatrix.needsUpdate = true;
  }, [trees]);

  useLayoutEffect(() => {
    if (!rockMeshRef.current || rocks.length === 0) return;
    const dummy = new THREE.Object3D();

    rocks.forEach((rock, i) => {
      dummy.position.set(rock.position[0], rock.position[1] + rock.scale * 0.2, rock.position[2]);
      dummy.scale.setScalar(rock.scale);
      dummy.updateMatrix();
      rockMeshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    rockMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [rocks]);

  useLayoutEffect(() => {
    return () => {
      canopyGeo.dispose();
      trunkGeo.dispose();
      rockGeo.dispose();
    };
  }, [canopyGeo, trunkGeo, rockGeo]);

  if (!visible) return null;

  return (
    <group>
      {trees.length > 0 && (
        <>
          <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, trees.length]} frustumCulled>
            <meshToonMaterial color="#5D4037" />
          </instancedMesh>
          <instancedMesh ref={canopyRef} args={[canopyGeo, undefined, trees.length]} frustumCulled>
            <meshToonMaterial color="#388E3C" />
          </instancedMesh>
        </>
      )}
      {rocks.length > 0 && (
        <instancedMesh ref={rockMeshRef} args={[rockGeo, undefined, rocks.length]} frustumCulled>
          <meshToonMaterial color="#78909C" />
        </instancedMesh>
      )}
    </group>
  );
}
