import { RoundedBox } from "@react-three/drei";
import type { SceneSpec, VehicleLayout } from "@/lib/visuals";
import { Lens, Steel, Trim } from "./materials";

/** A round tube between two points. */
function Tube({ from, to, radius = 0.025 }: { from: [number, number, number]; to: [number, number, number]; radius?: number }) {
  const [dx, dy, dz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(-dz, dx);
  const pitch = Math.asin(dy / length);
  return (
    <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={[0, yaw, pitch, "YZX"]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, length, 12]} />
        <Steel />
      </mesh>
    </group>
  );
}

/** Slatted platform with feet, on the roof. */
function RoofRack({ l, width, top }: { l: VehicleLayout; width: number; top: number }) {
  const start = l.windshieldTop + 0.12;
  const end = l.cabinBack - 0.3;
  const slats = Math.max(5, Math.round((end - start) / 0.2));
  const half = width / 2;
  return (
    <group>
      {[1, -1].map((s) => (
        <Tube key={s} from={[start, top, s * half]} to={[end, top, s * half]} radius={0.02} />
      ))}
      {Array.from({ length: slats + 1 }, (_, i) => {
        const x = start + ((end - start) * i) / slats;
        return <Tube key={i} from={[x, top, -half]} to={[x, top, half]} radius={0.012} />;
      })}
      {[start + 0.1, (start + end) / 2, end - 0.1].map((x) =>
        [1, -1].map((s) => <Tube key={`${x}${s}`} from={[x, top, s * half]} to={[x, l.roof, s * (half + 0.02)]} radius={0.014} />),
      )}
    </group>
  );
}

/** Frame over the bed, rising to cab height. */
function BedRack({ l, width, top }: { l: VehicleLayout; width: number; top: number }) {
  const start = l.cabinBack + 0.1;
  const end = l.rear - 0.14;
  const half = width / 2;
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s}>
          <Tube from={[start, top, s * half]} to={[end, top, s * half]} radius={0.024} />
          {[start, (start + end) / 2, end].map((x) => (
            <Tube key={x} from={[x, l.belt, s * half]} to={[x, top, s * half]} radius={0.024} />
          ))}
        </group>
      ))}
      {[start, start + (end - start) * 0.33, start + (end - start) * 0.66, end].map((x) => (
        <Tube key={x} from={[x, top, -half]} to={[x, top, half]} radius={0.016} />
      ))}
    </group>
  );
}

export function Accessories({ spec, l }: { spec: SceneSpec; l: VehicleLayout }) {
  const { shape, accessories, rackFor } = spec;
  const w = shape.width;
  const has = (kind: string) => (accessories as Set<string>).has(kind);
  const rackTop = l.roof + 0.09;
  const rackWidth = w - 0.42;
  const bed = rackFor === "bed";
  const tentStart = bed ? l.cabinBack + 0.04 : l.windshieldTop + 0.2;
  const tentEnd = bed ? l.rear - 0.08 : l.cabinBack - 0.34;
  const tentLength = tentEnd - tentStart;
  const bumperX = l.front - 0.09;
  const bumperY = l.sill + 0.2;
  const hoopTop = l.hoodFront + 0.02;

  return (
    <group>
      {has("bumper") || has("stealthbar") ? (
        <group>
          <RoundedBox args={[0.16, 0.26, w + 0.05]} radius={0.03} position={[bumperX, bumperY, 0]}>
            <Steel />
          </RoundedBox>
          {[1, -1].map((s) => (
            <mesh key={s} position={[bumperX - 0.08, bumperY + 0.03, s * (w * 0.4)]}>
              <boxGeometry args={[0.012, 0.07, 0.18]} />
              <Lens colour="#e8eef2" glow={0.4} />
            </mesh>
          ))}
          {has("bumper")
            ? [1, -1].map((s) => (
                <group key={s}>
                  <Tube from={[bumperX, bumperY + 0.1, s * 0.34]} to={[bumperX + 0.02, hoopTop, s * 0.3]} radius={0.028} />
                  <Tube from={[bumperX + 0.02, hoopTop, s * 0.3]} to={[bumperX + 0.02, hoopTop, 0]} radius={0.028} />
                  <Tube from={[bumperX, bumperY + 0.1, s * (w / 2 - 0.08)]} to={[bumperX + 0.02, hoopTop - 0.08, s * 0.3]} radius={0.024} />
                </group>
              ))
            : null}
        </group>
      ) : null}

      {has("winch") ? (
        <group position={[bumperX - 0.1, bumperY + 0.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.34, 18]} />
            <meshStandardMaterial color="#26282b" metalness={0.4} roughness={0.5} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, 0, s * 0.22]}>
              <boxGeometry args={[0.13, 0.14, 0.1]} />
              <meshStandardMaterial color="#121315" roughness={0.45} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[-0.08, 0, 0]}>
            <boxGeometry args={[0.03, 0.05, 0.16]} />
            <meshStandardMaterial color="#b9bdc3" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ) : null}

      {has("sliders")
        ? [1, -1].map((s) => (
            <group key={s}>
              <Tube
                from={[l.frontAxle + l.archRadius + 0.1, l.sill - 0.02, s * (w / 2 + 0.07)]}
                to={[l.rearAxle - l.archRadius - 0.1, l.sill - 0.02, s * (w / 2 + 0.07)]}
                radius={0.036}
              />
              {[0.25, 0.5, 0.75].map((t) => {
                const x = l.frontAxle + l.archRadius + (l.rearAxle - l.frontAxle - l.archRadius * 2) * t;
                return <Tube key={t} from={[x, l.sill - 0.02, s * (w / 2 + 0.07)]} to={[x, l.sill + 0.02, s * (w / 2 - 0.05)]} radius={0.02} />;
              })}
            </group>
          ))
        : null}

      {has("skid") ? (
        <mesh position={[l.frontAxle - 0.04, l.sill - 0.03, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[1.05, 0.03, w - 0.5]} />
          <meshStandardMaterial color="#62676e" metalness={0.7} roughness={0.42} />
        </mesh>
      ) : null}

      {has("snorkel") ? (
        <group>
          <Tube from={[l.windshieldBase - 0.14, l.cowl - 0.1, w / 2 + 0.05]} to={[l.windshieldBase + 0.04, l.cowl + 0.08, w / 2 + 0.05]} radius={0.04} />
          <Tube from={[l.windshieldBase + 0.04, l.cowl + 0.08, w / 2 + 0.05]} to={[l.windshieldTop + 0.01, l.roof - 0.02, w / 2 - 0.08]} radius={0.04} />
          <mesh position={[l.windshieldTop + 0.0, l.roof + 0.04, w / 2 - 0.09]}>
            <boxGeometry args={[0.14, 0.11, 0.11]} />
            <Trim />
          </mesh>
        </group>
      ) : null}

      {has("lightbar") ? (
        <group position={[l.windshieldTop + 0.1, l.roof + 0.075, 0]}>
          <RoundedBox args={[0.08, 0.1, w - 0.5]} radius={0.016}>
            <Trim />
          </RoundedBox>
          <mesh position={[-0.043, 0, 0]}>
            <boxGeometry args={[0.008, 0.07, w - 0.56]} />
            <Lens colour="#ffffff" glow={0.9} />
          </mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, -0.06, s * (w / 2 - 0.34)]}>
              <boxGeometry args={[0.05, 0.04, 0.05]} />
              <Trim />
            </mesh>
          ))}
        </group>
      ) : null}

      {has("pods")
        ? [1, -1].map((s) => (
            <group key={s} position={[l.windshieldBase - 0.06, l.cowl + 0.06, s * (w / 2 - 0.12)]}>
              <RoundedBox args={[0.1, 0.09, 0.09]} radius={0.012}>
                <Trim />
              </RoundedBox>
              <mesh position={[-0.052, 0, 0]}>
                <boxGeometry args={[0.006, 0.066, 0.066]} />
                <Lens colour="#ffffff" glow={0.9} />
              </mesh>
            </group>
          ))
        : null}

      {rackFor === "roof" ? <RoofRack l={l} width={rackWidth} top={rackTop} /> : null}
      {bed ? <BedRack l={l} width={w - 0.2} top={l.roof + 0.03} /> : null}

      {has("tent") ? (
        <group position={[(tentStart + tentEnd) / 2, (bed ? l.roof + 0.03 : rackTop) + 0.14, 0]}>
          <RoundedBox args={[tentLength, 0.2, w - 0.34]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color="#3c4046" metalness={0.15} roughness={0.55} />
          </RoundedBox>
          <mesh position={[0, -0.075, 0]}>
            <boxGeometry args={[tentLength + 0.005, 0.03, w - 0.33]} />
            <Trim />
          </mesh>
        </group>
      ) : null}

      {has("awning") ? (
        <mesh
          position={[(tentStart + tentEnd) / 2, (bed ? l.roof + 0.03 : rackTop) - 0.02, (bed ? w / 2 - 0.07 : rackWidth / 2 + 0.07)]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.07, 0.07, Math.max(tentLength, 1.2), 14]} />
          <meshStandardMaterial color="#2f3236" roughness={0.75} />
        </mesh>
      ) : null}

      {has("tonneau") ? (
        <mesh position={[(l.cabinBack + l.rear) / 2, l.belt + 0.02, 0]}>
          <boxGeometry args={[l.rear - l.cabinBack - 0.06, 0.03, w - 0.12]} />
          <meshStandardMaterial color="#111214" roughness={0.6} metalness={0.2} />
        </mesh>
      ) : null}
    </group>
  );
}
