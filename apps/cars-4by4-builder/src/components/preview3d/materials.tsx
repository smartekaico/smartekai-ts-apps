/** Shared looks, so every part of the model reads as the same object. */
export function Paint({ colour }: { colour: string }) {
  return <meshPhysicalMaterial color={colour} metalness={0.32} roughness={0.36} clearcoat={1} clearcoatRoughness={0.16} />;
}

export function Glass() {
  return <meshPhysicalMaterial color="#2a3a46" metalness={0.45} roughness={0.12} clearcoat={1} />;
}

export function Trim() {
  return <meshStandardMaterial color="#17191c" metalness={0.2} roughness={0.7} />;
}

export function Steel() {
  return <meshStandardMaterial color="#26292d" metalness={0.65} roughness={0.42} />;
}

export function Lens({ colour, glow = 0.5 }: { colour: string; glow?: number }) {
  return <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={glow} metalness={0.3} roughness={0.25} />;
}
