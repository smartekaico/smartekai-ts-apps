import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture } from "three";
import type { PerspectiveCamera } from "three";
import { STOCK_TYRE_RADIUS, sceneSpec, vehicleLayout } from "@/lib/visuals";
import type { SceneSpec } from "@/lib/visuals";
import { VehicleBody } from "./Vehicle";
import { Accessories } from "./Accessories";
import { Wheel } from "./Wheel";

const INCH = 0.0254;
// Lifts are shown a little taller than life so a 2" kit is still visible.
const LIFT_SCALE = 1.4;
const STUDIO = "#c6c8cb";
const FOV = 28;

/** Widens the lens on narrow canvases (phones) so the whole vehicle stays in frame. */
function FitLens() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const aspect = useThree((state) => state.size.width / state.size.height);
  useEffect(() => {
    camera.fov = aspect < 1.4 ? FOV * (1.4 / aspect) : FOV;
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return null;
}

/** A soft painted shadow: one textured plane, far cheaper on phones than a shadow pass. */
function GroundShadow({ length, width }: { length: number; width: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const glow = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
      glow.addColorStop(0, "rgba(0,0,0,0.72)");
      glow.addColorStop(0.62, "rgba(0,0,0,0.5)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new CanvasTexture(canvas);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[length * 1.28, width * 1.75]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function Model({ spec }: { spec: SceneSpec }) {
  const { shape, liftInches, tyreInches, wheel } = spec;
  const l = useMemo(() => vehicleLayout(shape), [shape]);
  const radius = (tyreInches / 2) * INCH;
  const bodyY = radius + liftInches * INCH * LIFT_SCALE;
  const track = shape.width / 2 - 0.13;
  return (
    <group>
      <group position={[0, bodyY, 0]}>
        <VehicleBody spec={spec} l={l} />
        <Accessories spec={spec} l={l} />
      </group>
      {[l.frontAxle, l.rearAxle].map((x) =>
        ([1, -1] as const).map((side) => (
          <Wheel key={`${x}${side}`} x={x} z={side * track} side={side} radius={radius} style={wheel} aggressive={tyreInches > 31} />
        )),
      )}
      {/* axles tie the wheels to the lifted body */}
      {[l.frontAxle, l.rearAxle].map((x) => (
        <mesh key={x} position={[x, radius, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, shape.width - 0.3, 10]} />
          <meshStandardMaterial color="#0d0e10" />
        </mesh>
      ))}
    </group>
  );
}

export default function Scene({ vehicleId, partIds }: { vehicleId: string; partIds: string[] }) {
  const spec = useMemo(() => sceneSpec(vehicleId, partIds), [vehicleId, partIds]);
  const [interacted, setInteracted] = useState(false);
  const controls = useRef<{ domElement?: HTMLElement } | null>(null);

  // OrbitControls sets touch-action:none, which would trap the page's scrolling.
  useEffect(() => {
    if (controls.current?.domElement) controls.current.domElement.style.touchAction = "pan-y";
  });

  if (!spec) return null;
  const distance = spec.shape.length * 1.72;

  return (
    <Canvas
      frameloop={interacted ? "demand" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [-distance * 0.66, 1.45, distance * 0.75], fov: FOV }}
      onPointerDown={() => setInteracted(true)}
    >
      <color attach="background" args={[STUDIO]} />
      <FitLens />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 7, 5]} intensity={1.5} />
      <directionalLight position={[5, 3, -4]} intensity={0.5} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 7, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-7, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[7, 2, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#9fb4c8" position={[0, 1, 8]} scale={[14, 2, 1]} />
      </Environment>
      <Model spec={spec} />
      <GroundShadow length={spec.shape.length} width={spec.shape.width} />
      <OrbitControls
        ref={controls as never}
        target={[0, STOCK_TYRE_RADIUS + 0.48, 0]}
        enablePan={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={distance * 0.6}
        maxDistance={distance * 1.35}
        autoRotate={!interacted}
        autoRotateSpeed={0.7}
      />
    </Canvas>
  );
}
