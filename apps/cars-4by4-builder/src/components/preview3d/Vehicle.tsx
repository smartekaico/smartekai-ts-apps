import { useMemo } from "react";
import type { SceneSpec } from "@/lib/visuals";

const INCH = 0.0254;

function Wheel({ x, z, radius, style }: { x: number; z: number; radius: number; style: "stock" | "fuel" | "method" }) {
  return (
    <group position={[x, radius, z]}>
      {/* tyre */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 0.28, 24]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, 0.12, 24]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      {style === "fuel" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <boxGeometry args={[radius * 0.9, 0.05, radius * 0.9]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ) : null}
      {style === "method" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
          <ringGeometry args={[radius * 0.25, radius * 0.55, 16]} />
          <meshStandardMaterial color="#6b7280" side={2} />
        </mesh>
      ) : null}
    </group>
  );
}

export function Vehicle({ spec }: { spec: SceneSpec }) {
  const { shape, liftInches, tyreInches, wheel } = spec;
  const tyreRadius = (tyreInches / 2) * INCH * 1.05;
  const lift = liftInches * INCH * 1.5;
  const baseRide = 0.32;
  const bodyY = baseRide + lift + tyreRadius;
  const halfLen = shape.length / 2;
  const halfW = shape.width / 2;

  const wheels = useMemo(() => {
    const wb = shape.wheelbase / 2;
    const positions: Array<[number, number]> = [
      [-wb, halfW - 0.12],
      [-wb, -(halfW - 0.12)],
      [wb, halfW - 0.12],
      [wb, -(halfW - 0.12)],
    ];
    return positions.map(([x, z], i) => (
      <Wheel key={i} x={x} z={z} radius={tyreRadius} style={wheel} />
    ));
  }, [shape.wheelbase, shape.width, tyreRadius, wheel]);

  if (shape.body === "suv") {
    return (
      <group>
        {/* body */}
        <mesh position={[0, bodyY, 0]}>
          <boxGeometry args={[shape.length * 0.95, shape.height * 0.55, shape.width * 0.95]} />
          <meshStandardMaterial color={shape.colour} />
        </mesh>
        {/* roof */}
        <mesh position={[0, bodyY + shape.height * 0.32, 0]}>
          <boxGeometry args={[shape.length * 0.85, shape.height * 0.22, shape.width * 0.9]} />
          <meshStandardMaterial color={shape.colour} />
        </mesh>
        {/* windows */}
        <mesh position={[0, bodyY + shape.height * 0.32, 0]}>
          <boxGeometry args={[shape.length * 0.78, shape.height * 0.16, shape.width * 0.92]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.55} />
        </mesh>
        {wheels}
      </group>
    );
  }

  // pickup
  const bedLen = shape.bedLength ?? 1.6;
  const cabLen = shape.length - bedLen;
  return (
    <group>
      {/* cab */}
      <mesh position={[-bedLen / 2 + 0.1, bodyY, 0]}>
        <boxGeometry args={[cabLen * 0.95, shape.height * 0.6, shape.width * 0.95]} />
        <meshStandardMaterial color={shape.colour} />
      </mesh>
      {/* cab roof */}
      <mesh position={[-bedLen / 2 + 0.1, bodyY + shape.height * 0.32, 0]}>
        <boxGeometry args={[cabLen * 0.85, shape.height * 0.2, shape.width * 0.9]} />
        <meshStandardMaterial color={shape.colour} />
      </mesh>
      {/* windows */}
      <mesh position={[-bedLen / 2 + 0.1, bodyY + shape.height * 0.32, 0]}>
        <boxGeometry args={[cabLen * 0.78, shape.height * 0.14, shape.width * 0.92]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.55} />
      </mesh>
      {/* bed floor */}
      <mesh position={[cabLen / 2 - 0.05, bodyY - shape.height * 0.22, 0]}>
        <boxGeometry args={[bedLen * 0.98, 0.06, shape.width * 0.95]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* bed sides */}
      <mesh position={[cabLen / 2 - 0.05, bodyY, shape.width * 0.46]}>
        <boxGeometry args={[bedLen * 0.98, shape.height * 0.32, 0.06]} />
        <meshStandardMaterial color={shape.colour} />
      </mesh>
      <mesh position={[cabLen / 2 - 0.05, bodyY, -shape.width * 0.46]}>
        <boxGeometry args={[bedLen * 0.98, shape.height * 0.32, 0.06]} />
        <meshStandardMaterial color={shape.colour} />
      </mesh>
      {wheels}
    </group>
  );
}