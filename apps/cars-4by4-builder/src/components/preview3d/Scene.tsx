import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import { sceneSpec } from "@/lib/visuals";
import { Vehicle } from "./Vehicle";
import { Accessories } from "./Accessories";

export default function Scene({ vehicleId, partIds }: { vehicleId: string; partIds: string[] }) {
  const spec = useMemo(() => sceneSpec(vehicleId, partIds), [vehicleId, partIds]);
  const [interacted, setInteracted] = useState(false);
  const controlsRef = useRef<any>(null);

  if (!spec) return null;

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [6, 3, 6], fov: 35 }}
      onPointerDown={() => setInteracted(true)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.6, 32]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.25} />
      </mesh>
      <group>
        <Vehicle spec={spec} />
        <Accessories spec={spec} />
      </group>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={12}
        autoRotate={!interacted}
        autoRotateSpeed={0.6}
      />
    </Canvas>
  );
}