import * as THREE from "three";

// Hati 3D dengan bevel (dipakai kalender bulan & toples). Ukuran kira-kira 2.3 × 2 unit, titik pusat di tengah.
export function heartGeometry({ curveSegments = 20, bevelSegments = 6 } = {}) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.bezierCurveTo(-0.15, -0.65, -1, -0.35, -1, 0.25);
  s.bezierCurveTo(-1, 0.75, -0.45, 1.0, 0, 0.55);
  s.bezierCurveTo(0.45, 1.0, 1, 0.75, 1, 0.25);
  s.bezierCurveTo(1, -0.35, 0.15, -0.65, 0, -0.9);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.25, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.15, bevelSegments, curveSegments,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}
