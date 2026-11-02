import type { SceneSpec } from "@/lib/visuals";

export function Accessories({ spec }: { spec: SceneSpec }) {
  const { shape, accessories, rackFor } = spec;
  const isPickup = shape.body === "pickup";
  const bedLen = shape.bedLength ?? 1.6;
  const cabLen = shape.length - bedLen;
  const bodyY = 0.32 + spec.liftInches * 0.0254 * 1.5 + (spec.tyreInches / 2) * 0.0254 * 1.05;
  const roofY = bodyY + shape.height * 0.42;
  const frontX = -shape.length / 2 + 0.15;
  const rackY = roofY + 0.05;
  const rackIsBed = rackFor === "bed";
  const rackLen = rackIsBed ? bedLen * 0.9 : shape.length * 0.55;
  const rackX = rackIsBed ? cabLen / 2 - 0.05 : 0;
  const tentLen = rackIsBed ? bedLen * 0.7 : shape.length * 0.45;
  const tentX = rackIsBed ? cabLen / 2 - 0.05 : 0;
  const awningLen = rackIsBed ? bedLen * 0.6 : shape.length * 0.4;
  const awningX = rackIsBed ? cabLen / 2 - 0.05 : 0;
  const hasRack = rackFor !== null;

  return (
    <group>
      {accessories.has("bumper") || accessories.has("stealthbar") ? (
        <mesh position={[frontX - 0.15, bodyY - shape.height * 0.05, 0]}>
          <boxGeometry args={[0.12, shape.height * 0.22, shape.width * 0.9]} />
          <meshStandardMaterial color={accessories.has("stealthbar") ? "#374151" : "#1f2937"} />
        </mesh>
      ) : null}
      {accessories.has("winch") ? (
        <mesh position={[frontX - 0.22, bodyY - shape.height * 0.02, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.35]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ) : null}
      {accessories.has("sliders") ? (
        <>
          <mesh position={[0, bodyY - shape.height * 0.22, shape.width * 0.48]}>
            <boxGeometry args={[shape.length * 0.7, 0.06, 0.08]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh position={[0, bodyY - shape.height * 0.22, -shape.width * 0.48]}>
            <boxGeometry args={[shape.length * 0.7, 0.06, 0.08]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </>
      ) : null}
      {accessories.has("skid") ? (
        <mesh position={[frontX + 0.1, bodyY - shape.height * 0.32, 0]}>
          <boxGeometry args={[0.6, 0.04, shape.width * 0.8]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ) : null}
      {accessories.has("snorkel") ? (
        <mesh position={[-shape.length * 0.15, bodyY + shape.height * 0.4, -shape.width * 0.48]}>
          <boxGeometry args={[0.06, shape.height * 0.5, 0.06]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ) : null}
      {accessories.has("lightbar") ? (
        <mesh position={[0, roofY + 0.05, 0.05]}>
          <boxGeometry args={[0.9, 0.06, 0.08]} />
          <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={0.3} />
        </mesh>
      ) : null}
      {accessories.has("pods") ? (
        <>
          <mesh position={[frontX - 0.05, bodyY + shape.height * 0.05, shape.width * 0.35]}>
            <boxGeometry args={[0.12, 0.08, 0.08]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[frontX - 0.05, bodyY + shape.height * 0.05, -shape.width * 0.35]}>
            <boxGeometry args={[0.12, 0.08, 0.08]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </>
      ) : null}
      {hasRack ? (
        <mesh position={[rackX, rackY, 0]}>
          <boxGeometry args={[rackLen, 0.04, shape.width * (rackIsBed ? 0.85 : 0.75)]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ) : null}
      {accessories.has("tent") ? (
        <mesh position={[tentX, rackY + 0.12, 0]}>
          <boxGeometry args={[tentLen, 0.18, shape.width * 0.6]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      ) : null}
      {accessories.has("awning") && hasRack ? (
        <mesh position={[awningX, rackY, shape.width * 0.42]}>
          <cylinderGeometry args={[0.06, 0.06, awningLen, 12]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ) : null}
      {(accessories as Set<string>).has("tonneau") ? (
        <mesh position={[cabLen / 2 - 0.05, bodyY + 0.02, 0]}>
          <boxGeometry args={[bedLen * 0.96, 0.04, shape.width * 0.9]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ) : null}
    </group>
  );
}