import * as THREE from 'three';

/** Merges multiple geometries into one BufferGeometry (positions only + optional color). */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  for (const geo of geos) {
    geo.computeVertexNormals();
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    const idx = geo.getIndex();

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nor) {
        normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      } else {
        normals.push(0, 1, 0);
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + indexOffset);
      }
    }
    indexOffset += pos.count;
    geo.dispose();
  }

  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  merged.computeBoundingSphere();
  return merged;
}

/** Unit house: body 1×0.7×1 + pitched roof. Scale by width/height/depth in instance. */
export function createHouseGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.7, 1);
  body.translate(0, 0.35, 0);

  // Simple pitched roof as a prism (wedge)
  const roof = new THREE.ConeGeometry(0.75, 0.4, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 0.9, 0);

  return mergeGeometries([body, roof]);
}

/** Unit apartment block with slight setback top. */
export function createApartmentGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1, 0.85, 1);
  base.translate(0, 0.425, 0);
  const top = new THREE.BoxGeometry(0.85, 0.2, 0.85);
  top.translate(0, 0.95, 0);
  return mergeGeometries([base, top]);
}

/** Unit tower with thin body + cap. */
export function createTowerGeometry(): THREE.BufferGeometry {
  const shaft = new THREE.BoxGeometry(0.9, 0.92, 0.9);
  shaft.translate(0, 0.46, 0);
  const cap = new THREE.BoxGeometry(0.7, 0.1, 0.7);
  cap.translate(0, 0.97, 0);
  return mergeGeometries([shaft, cap]);
}

/** Low-poly car: chassis + cabin. Unit length ~1 along Z. */
export function createCarGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.55, 0.28, 1.1);
  body.translate(0, 0.18, 0);
  const cabin = new THREE.BoxGeometry(0.48, 0.26, 0.55);
  cabin.translate(0, 0.42, -0.05);
  return mergeGeometries([body, cabin]);
}

/** Low-poly person: torso + head (very few verts). */
export function createPersonGeometry(): THREE.BufferGeometry {
  const torso = new THREE.BoxGeometry(0.28, 0.5, 0.18);
  torso.translate(0, 0.35, 0);
  const head = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  head.translate(0, 0.72, 0);
  return mergeGeometries([torso, head]);
}

export function createRoadTileGeometry(cellSize: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(cellSize * 0.95, 0.08, cellSize * 0.95);
  return geo;
}
