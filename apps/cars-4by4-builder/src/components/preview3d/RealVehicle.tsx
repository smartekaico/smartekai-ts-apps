import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { VEHICLE_MODELS } from "@/lib/visuals";
import type { SceneSpec } from "@/lib/visuals";

const GLB_URL = VEHICLE_MODELS["tacoma-3g"];

export function RealVehicle({ spec }: { spec: SceneSpec }) {
  const { scene, nodes } = useGLTF(GLB_URL, undefined, true);
  const groupRef = useRef<any>(null);

  useEffect(() => {
    const body = (nodes as any)?.body;
    if (body) {
      // Best-effort lift: raise the body node. The model's coordinate space is
      // Sketchfab's; Y is up in world space after the node transforms.
      body.position.y = (body.position.y ?? 0) + spec.liftInches * 0.0254 * 1.5;
    }
  }, [nodes, spec.liftInches]);

  // Normalize the model to the scene's metre scale (the GLB renders ~3.2 m long).
  const scale = 5.4 / 3.21;
  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(GLB_URL, undefined, true);