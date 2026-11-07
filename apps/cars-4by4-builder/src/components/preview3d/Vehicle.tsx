import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import type { SceneSpec, VehicleLayout, VehicleShape } from "@/lib/visuals";
import { Glass, Lens, Paint, Steel, Trim } from "./materials";

const BEVEL = 0.035;

/** Extrudes a side profile across the vehicle, centred on z. */
function extrude(shape: Shape, width: number, bevel = BEVEL) {
  const geometry = new ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2);
  return geometry;
}

/** Lower body: nose, hood, sills and the two wheel arches, as one silhouette. */
function lowerBody(l: VehicleLayout, pickup: boolean) {
  const s = new Shape();
  s.moveTo(l.front + 0.08, l.sill);
  s.lineTo(l.front + 0.01, l.sill + 0.14);
  s.lineTo(l.front, l.hoodFront - 0.12);
  s.quadraticCurveTo(l.front + 0.01, l.hoodFront, l.front + 0.16, l.hoodFront + 0.01);
  s.quadraticCurveTo(l.windshieldBase - 0.5, l.cowl - 0.01, l.windshieldBase, l.cowl);
  s.lineTo(l.cabinBack, l.belt);
  if (pickup) {
    s.lineTo(l.cabinBack, l.bedFloor);
    s.lineTo(l.rear, l.bedFloor);
  } else {
    s.lineTo(l.rear, l.belt);
  }
  s.lineTo(l.rear, l.sill + 0.12);
  s.lineTo(l.rear - 0.07, l.sill);
  for (const axle of [l.rearAxle, l.frontAxle]) {
    s.lineTo(axle + l.archRadius, l.sill);
    s.lineTo(axle + l.archRadius, 0);
    s.absarc(axle, 0, l.archRadius, 0, Math.PI, false);
    s.lineTo(axle - l.archRadius, l.sill);
  }
  s.closePath();
  return s;
}

/** The cabin's glass volume, narrower than the body so the sides tuck in. */
function greenhouse(l: VehicleLayout, pickup: boolean) {
  const back = pickup ? l.cabinBack - 0.02 : l.rear - 0.14;
  const s = new Shape();
  s.moveTo(l.windshieldBase, l.belt - 0.03);
  s.lineTo(l.windshieldTop, l.roof - 0.05);
  s.lineTo(back - (pickup ? 0.12 : 0.05), l.roof - 0.05);
  s.lineTo(back, l.belt - 0.03);
  s.closePath();
  return s;
}

function roofPanel(l: VehicleLayout, pickup: boolean) {
  const back = pickup ? l.cabinBack - 0.12 : l.rear - 0.17;
  const s = new Shape();
  s.moveTo(l.windshieldTop - 0.05, l.roof - 0.06);
  s.quadraticCurveTo(l.windshieldTop + 0.1, l.roof, l.windshieldTop + 0.32, l.roof);
  s.lineTo(back - 0.12, l.roof);
  s.quadraticCurveTo(back, l.roof, back + 0.03, l.roof - 0.06);
  s.closePath();
  return s;
}

/** A thin painted post between two points of the side profile. */
function Pillar({
  from,
  to,
  z,
  thickness,
  colour,
}: {
  from: [number, number];
  to: [number, number];
  z: number;
  thickness: number;
  colour: string;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx)]}>
      <boxGeometry args={[Math.hypot(dx, dy), thickness, 0.05]} />
      <Paint colour={colour} />
    </mesh>
  );
}

function Cabin({ shape, l }: { shape: VehicleShape; l: VehicleLayout }) {
  const pickup = shape.body === "pickup";
  const glassWidth = shape.width - 0.2;
  const glass = useMemo(() => extrude(greenhouse(l, pickup), glassWidth, 0.03), [l, pickup, glassWidth]);
  const roof = useMemo(() => extrude(roofPanel(l, pickup), shape.width - 0.17, 0.03), [l, pickup, shape.width]);
  const back = pickup ? l.cabinBack - 0.02 : l.rear - 0.14;
  const postZ = glassWidth / 2 + 0.002;
  const doorSplit = pickup ? (l.windshieldTop + back) / 2 - 0.04 : l.windshieldTop + 0.82;
  const rearPost = l.windshieldTop + (pickup ? 1.5 : 1.75);
  return (
    <group>
      <mesh geometry={glass}>
        <Glass />
      </mesh>
      <mesh geometry={roof}>
        <Paint colour={shape.colour} />
      </mesh>
      {[1, -1].map((side) => (
        <group key={side}>
          <Pillar
            from={[l.windshieldBase + 0.02, l.belt - 0.02]}
            to={[l.windshieldTop + 0.02, l.roof - 0.05]}
            z={side * (postZ - 0.02)}
            thickness={0.085}
            colour={shape.colour}
          />
          <Pillar
            from={[doorSplit, l.belt - 0.02]}
            to={[doorSplit + 0.02, l.roof - 0.05]}
            z={side * postZ}
            thickness={0.09}
            colour="#17191c"
          />
          {!pickup ? (
            <Pillar
              from={[Math.min(rearPost, l.rear - 0.5), l.belt - 0.02]}
              to={[Math.min(rearPost, l.rear - 0.5) + 0.03, l.roof - 0.05]}
              z={side * postZ}
              thickness={0.13}
              colour={shape.colour}
            />
          ) : null}
          <Pillar
            from={[back - 0.03, l.belt - 0.02]}
            to={[back - (pickup ? 0.14 : 0.07), l.roof - 0.05]}
            z={side * postZ}
            thickness={pickup ? 0.1 : 0.18}
            colour={shape.colour}
          />
          {/* mirror */}
          <mesh position={[l.windshieldBase + 0.2, l.belt + 0.08, side * (shape.width / 2 + 0.09)]}>
            <boxGeometry args={[0.07, 0.15, 0.2]} />
            <Trim />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BedWalls({ shape, l }: { shape: VehicleShape; l: VehicleLayout }) {
  const length = l.rear - l.cabinBack;
  const height = l.belt - l.bedFloor;
  const midX = (l.rear + l.cabinBack) / 2;
  const midY = (l.belt + l.bedFloor) / 2;
  return (
    <group>
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[midX, midY, side * (shape.width / 2 - 0.05)]}>
            <boxGeometry args={[length, height, 0.1]} />
            <Paint colour={shape.colour} />
          </mesh>
          {/* bed rail cap */}
          <mesh position={[midX, l.belt + 0.012, side * (shape.width / 2 - 0.05)]}>
            <boxGeometry args={[length, 0.024, 0.11]} />
            <Trim />
          </mesh>
        </group>
      ))}
      {/* bed floor liner */}
      <mesh position={[midX, l.bedFloor + 0.038, 0]}>
        <boxGeometry args={[length - 0.04, 0.01, shape.width - 0.2]} />
        <Trim />
      </mesh>
      {/* tailgate */}
      <mesh position={[l.rear - 0.02, midY, 0]}>
        <boxGeometry args={[0.07, height, shape.width - 0.2]} />
        <Paint colour={shape.colour} />
      </mesh>
    </group>
  );
}

function Details({ shape, l }: { shape: VehicleShape; l: VehicleLayout }) {
  const pickup = shape.body === "pickup";
  const w = shape.width;
  const side = w / 2 + 0.004;
  const face = l.front - BEVEL - 0.008;
  const grilleY = l.hoodFront - 0.2;
  const seam = (x: number, top: number) => (
    <>
      {[1, -1].map((s) => (
        <mesh key={s} position={[x, (l.sill + top) / 2 + 0.02, s * side]}>
          <boxGeometry args={[0.012, top - l.sill - 0.06, 0.004]} />
          <meshStandardMaterial color="#000000" transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  );
  const doorFront = l.windshieldBase + 0.06;
  const doorMid = doorFront + (pickup ? 0.98 : 0.96);
  const doorRear = pickup ? l.cabinBack - 0.03 : Math.min(doorMid + 0.86, l.rearAxle - l.archRadius - 0.02);
  return (
    <group>
      {/* grille */}
      <mesh position={[face, grilleY, 0]}>
        <boxGeometry args={[0.03, 0.3, w * 0.62]} />
        <meshStandardMaterial color="#0c0d0f" metalness={0.4} roughness={0.6} />
      </mesh>
      {[-0.08, 0, 0.08].map((y) => (
        <mesh key={y} position={[face - 0.018, grilleY + y, 0]}>
          <boxGeometry args={[0.012, 0.022, w * 0.6]} />
          <Steel />
        </mesh>
      ))}
      {/* headlights */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[face + 0.005, grilleY + 0.04, s * (w * 0.405)]}>
            <boxGeometry args={[0.03, 0.15, w * 0.15]} />
            <Lens colour="#eef3f7" glow={0.65} />
          </mesh>
          {/* tail lights */}
          <mesh position={[l.rear + BEVEL + 0.006, l.belt - (pickup ? 0.16 : 0.2), s * (w / 2 - 0.09)]}>
            <boxGeometry args={[0.03, 0.3, 0.13]} />
            <Lens colour="#a11212" glow={0.5} />
          </mesh>
        </group>
      ))}
      {/* hood shut line and shoulder crease */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[(l.front + l.rear) / 2, l.belt - 0.09, s * (side + 0.001)]}>
          <boxGeometry args={[l.rear - l.front - 0.3, 0.012, 0.004]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.16} />
        </mesh>
      ))}
      {/* bumpers */}
      <mesh position={[l.front - 0.05, l.sill + 0.14, 0]}>
        <boxGeometry args={[0.1, 0.24, w + 0.03]} />
        <Trim />
      </mesh>
      <mesh position={[l.rear + 0.05, l.sill + 0.16, 0]}>
        <boxGeometry args={[0.12, 0.17, w + 0.03]} />
        <Trim />
      </mesh>
      {/* lower cladding */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[(l.frontAxle + l.rearAxle) / 2, l.sill + 0.05, s * (w / 2 + 0.003)]}>
          <boxGeometry args={[l.rearAxle - l.frontAxle - l.archRadius * 2 - 0.02, 0.1, 0.012]} />
          <Trim />
        </mesh>
      ))}
      {/* door seams and handles */}
      {seam(doorFront, l.belt)}
      {seam(doorMid, l.belt)}
      {seam(doorRear, l.belt)}
      {[doorMid - 0.2, doorRear - 0.2].map((x) =>
        [1, -1].map((s) => (
          <mesh key={`${x}${s}`} position={[x, l.belt - 0.13, s * (side + 0.008)]}>
            <boxGeometry args={[0.15, 0.03, 0.02]} />
            <Trim />
          </mesh>
        )),
      )}
      {/* fender flares */}
      {[l.frontAxle, l.rearAxle].map((axle) =>
        [1, -1].map((s) => (
          <mesh key={`${axle}${s}`} position={[axle, 0, s * (w / 2 + 0.006)]}>
            <torusGeometry args={[l.archRadius + 0.012, 0.042, 10, 28, Math.PI]} />
            <Trim />
          </mesh>
        )),
      )}
      {/* dark wheel houses and underbody */}
      <mesh position={[(l.front + l.rear) / 2, 0.14, 0]}>
        <boxGeometry args={[l.rear - l.front - 0.14, 0.52, w - 0.72]} />
        <meshStandardMaterial color="#08090a" />
      </mesh>
    </group>
  );
}

/** Everything that rides on the suspension, built around the stock axle height. */
export function VehicleBody({ spec, l }: { spec: SceneSpec; l: VehicleLayout }) {
  const { shape } = spec;
  const pickup = shape.body === "pickup";
  const body = useMemo(() => extrude(lowerBody(l, pickup), shape.width), [l, pickup, shape.width]);
  return (
    <group>
      <mesh geometry={body}>
        <Paint colour={shape.colour} />
      </mesh>
      <Cabin shape={shape} l={l} />
      {pickup ? <BedWalls shape={shape} l={l} /> : null}
      <Details shape={shape} l={l} />
    </group>
  );
}
