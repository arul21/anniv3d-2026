"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Pencahayaan realistis untuk material logam/perhiasan: environment map studio untuk pantulan PBR.
export default function Studio({ intensity = 0.9 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    /* eslint-disable react-hooks/immutability -- scene three.js memang diubah langsung (pola React Three Fiber) */
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => { scene.environment = null; env.dispose(); pmrem.dispose(); };
    /* eslint-enable react-hooks/immutability */
  }, [gl, scene, intensity]);
  return null;
}
