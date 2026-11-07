import { useLayoutEffect, useMemo, useRef } from "react";
import { LatheGeometry, Matrix4, Object3D, Vector2 } from "three";
import type { InstancedMesh } from "three";

const TYRE_WIDTH = 0.31;

const RIMS = {
  stock: { colour: "#b8bcc2", metalness: 0.85, roughness: 0.3, spokes: 6, spokeWidth: 0.05 },
  fuel: { colour: "#1b1d20", metalness: 0.5, roughness: 0.5, spokes: 6, spokeWidth: 0.075 },
  method: { colour: "#8a6a3c", metalness: 0.7, roughness: 0.42, spokes: 10, spokeWidth: 0.034 },
} as const;

/** A tread block around the shoulder, instanced: 2 staggered rows per side. */
function Tread({ radius, lugs, depth }: { radius: number; lugs: number; depth: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    let i = 0;
    for (let n = 0; n < lugs; n++) {
      for (const [row, offset] of [
        [-0.105, 0],
        [-0.035, 0.5],
        [0.035, 0],
        [0.105, 0.5],
      ] as const) {
        const angle = ((n + offset) / lugs) * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, row);
        dummy.rotation.set(0, 0, angle);
        dummy.updateMatrix();
        mesh.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [radius, lugs]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lugs * 4]}>
      <boxGeometry args={[depth, (Math.PI * 2 * radius) / lugs / 1.7, 0.058]} />
      <meshStandardMaterial color="#121315" roughness={0.95} />
    </instancedMesh>
  );
}

export function Wheel({
  x,
  side,
  z,
  radius,
  style,
  aggressive,
}: {
  x: number;
  side: 1 | -1;
  z: number;
  radius: number;
  style: keyof typeof RIMS;
  aggressive: boolean;
}) {
  const rim = RIMS[style];
  const rimRadius = 0.235;
  const tyre = useMemo(() => {
    const half = TYRE_WIDTH / 2;
    const r = radius - 0.018;
    const points = [
      [rimRadius - 0.01, -half],
      [rimRadius + 0.03, -half - 0.008],
      [r - 0.07, -half - 0.014],
      [r - 0.02, -half + 0.012],
      [r, -half + 0.05],
      [r, half - 0.05],
      [r - 0.02, half - 0.012],
      [r - 0.07, half + 0.014],
      [rimRadius + 0.03, half + 0.008],
      [rimRadius - 0.01, half],
    ].map(([a, b]) => new Vector2(a, b));
    const geometry = new LatheGeometry(points, 40);
    geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));
    return geometry;
  }, [radius]);

  const face = TYRE_WIDTH / 2 - 0.035;
  return (
    <group position={[x, radius, z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <mesh geometry={tyre}>
        <meshStandardMaterial color="#1a1b1d" roughness={0.92} side={2} />
      </mesh>
      <Tread radius={radius - 0.012} lugs={aggressive ? 22 : 30} depth={aggressive ? 0.05 : 0.03} />
      {/* barrel, recessed behind the spokes */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, face - 0.09]}>
        <cylinderGeometry args={[rimRadius, rimRadius, 0.16, 32, 1, true]} />
        <meshStandardMaterial color="#3a3d42" metalness={0.7} roughness={0.4} side={2} />
      </mesh>
      <mesh position={[0, 0, face - 0.16]}>
        <circleGeometry args={[rimRadius, 32]} />
        <meshStandardMaterial color="#0d0e10" />
      </mesh>
      {/* lip */}
      <mesh position={[0, 0, face]}>
        <torusGeometry args={[rimRadius, style === "method" ? 0.022 : 0.012, 10, 40]} />
        <meshStandardMaterial color={rim.colour} metalness={rim.metalness} roughness={rim.roughness} />
      </mesh>
      {Array.from({ length: rim.spokes }, (_, i) => {
        const angle = (i / rim.spokes) * Math.PI * 2;
        const mid = rimRadius * 0.54;
        return (
          <mesh key={i} position={[Math.cos(angle) * mid, Math.sin(angle) * mid, face - 0.015]} rotation={[0, 0, angle]}>
            <boxGeometry args={[rimRadius * 0.92, rim.spokeWidth, 0.03]} />
            <meshStandardMaterial color={rim.colour} metalness={rim.metalness} roughness={rim.roughness} />
          </mesh>
        );
      })}
      {/* hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, face - 0.005]}>
        <cylinderGeometry args={[0.062, 0.07, 0.05, 20]} />
        <meshStandardMaterial color={rim.colour} metalness={rim.metalness} roughness={rim.roughness} />
      </mesh>
      {/* beadlock bolts */}
      {style === "method"
        ? Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(angle) * rimRadius, Math.sin(angle) * rimRadius, face + 0.02]}>
                <sphereGeometry args={[0.0085, 6, 6]} />
                <meshStandardMaterial color="#d8d8d8" metalness={0.9} roughness={0.3} />
              </mesh>
            );
          })
        : null}
    </group>
  );
}
