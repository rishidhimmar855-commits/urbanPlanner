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

/** Park: flat pad with two cone trees. Unit footprint 1x1, height ~1. */
export function createParkGeometry(): THREE.BufferGeometry {
  const pad = new THREE.BoxGeometry(1, 0.08, 1);
  pad.translate(0, 0.04, 0);

  const trunk1 = new THREE.BoxGeometry(0.06, 0.25, 0.06);
  trunk1.translate(-0.25, 0.2, -0.2);
  const crown1 = new THREE.ConeGeometry(0.18, 0.5, 6);
  crown1.translate(-0.25, 0.55, -0.2);

  const trunk2 = new THREE.BoxGeometry(0.06, 0.2, 0.06);
  trunk2.translate(0.25, 0.18, 0.22);
  const crown2 = new THREE.ConeGeometry(0.14, 0.4, 6);
  crown2.translate(0.25, 0.46, 0.22);

  return mergeGeometries([pad, trunk1, crown1, trunk2, crown2]);
}

/** School: long low body + pitched roof + small entrance block. */
export function createSchoolGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.5, 0.55);
  body.translate(0, 0.25, 0);

  const roof = new THREE.ConeGeometry(0.42, 0.28, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale(1.35, 1, 0.75);
  roof.translate(0, 0.64, 0);

  const entrance = new THREE.BoxGeometry(0.3, 0.35, 0.25);
  entrance.translate(0, 0.175, 0.38);

  return mergeGeometries([body, roof, entrance]);
}

/** Hospital: main block + cross made of two thin boxes on the roof. */
export function createHospitalGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.85, 0.8, 0.85);
  body.translate(0, 0.4, 0);

  const crossV = new THREE.BoxGeometry(0.1, 0.34, 0.1);
  crossV.translate(0, 0.98, 0);
  const crossH = new THREE.BoxGeometry(0.34, 0.1, 0.1);
  crossH.translate(0, 0.98, 0);

  return mergeGeometries([body, crossV, crossH]);
}

/** Market: low body + wide flat canopy on posts. */
export function createMarketGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.7, 0.4, 0.7);
  body.translate(0, 0.2, 0);

  const canopy = new THREE.BoxGeometry(1, 0.06, 1);
  canopy.translate(0, 0.56, 0);

  const posts: THREE.BufferGeometry[] = [];
  for (const [px, pz] of [
    [-0.44, -0.44],
    [0.44, -0.44],
    [-0.44, 0.44],
    [0.44, 0.44],
  ]) {
    const post = new THREE.BoxGeometry(0.06, 0.53, 0.06);
    post.translate(px, 0.265, pz);
    posts.push(post);
  }

  return mergeGeometries([body, canopy, ...posts]);
}

/** Community hall: box + low-poly half dome. */
export function createCommunityGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(0.9, 0.55, 0.9);
  body.translate(0, 0.275, 0);

  const dome = new THREE.SphereGeometry(0.35, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(0, 0.55, 0);

  return mergeGeometries([body, dome]);
}

/** Sports ground: flat pad + two goal frames. */
export function createSportsGeometry(): THREE.BufferGeometry {
  const pad = new THREE.BoxGeometry(1, 0.06, 0.7);
  pad.translate(0, 0.03, 0);

  const goals: THREE.BufferGeometry[] = [];
  for (const gx of [-0.46, 0.46]) {
    const bar = new THREE.BoxGeometry(0.04, 0.04, 0.3);
    bar.translate(gx, 0.26, 0);
    const postA = new THREE.BoxGeometry(0.04, 0.26, 0.04);
    postA.translate(gx, 0.13, -0.15);
    const postB = new THREE.BoxGeometry(0.04, 0.26, 0.04);
    postB.translate(gx, 0.13, 0.15);
    goals.push(bar, postA, postB);
  }

  return mergeGeometries([pad, ...goals]);
}
