import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Edges, Html } from '@react-three/drei';
import type { BoxDimensions, Placement } from '../types';

interface BoxSceneProps {
  box: BoxDimensions;
  placements: Placement[];
  highlightedItemId?: string;
}

function PackedItem({ item, highlighted }: { item: Placement; highlighted: boolean }) {
  return (
    <mesh position={[item.position[0], item.position[2], item.position[1]]} scale={highlighted ? 1.04 : 1}>
      <boxGeometry args={[item.size[0], item.size[2], item.size[1]]} />
      <meshStandardMaterial
        color={item.color}
        emissive={highlighted ? '#7cb8ff' : '#000000'}
        emissiveIntensity={highlighted ? 0.45 : 0}
        transparent
        opacity={item.category === 'shoe-box' ? (highlighted ? 1 : 0.92) : 0.28}
        metalness={0.32}
        roughness={0.24}
      />
      <Edges color="#e6eefc" threshold={14} />
      {item.category === 'shoe-box' ? (
        <Html distanceFactor={11} center>
          <div className={`cube-label ${highlighted ? 'active' : ''}`}>{item.id.replace('shoe-', '#')}</div>
        </Html>
      ) : null}
    </mesh>
  );
}

export function BoxScene({ box, placements, highlightedItemId }: BoxSceneProps) {
  return (
    <Canvas camera={{ position: [95, 95, 95], fov: 38 }}>
      <color attach="background" args={['#050913']} />
      <fog attach="fog" args={['#050913', 100, 260]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[80, 120, 65]} intensity={1.1} />
      <pointLight position={[0, 140, 0]} intensity={1.8} color="#60a5fa" />
      <Environment preset="city" />

      <group position={[-box.length / 2, 0, -box.width / 2]}>
        <mesh position={[box.length / 2, box.height / 2, box.width / 2]}>
          <boxGeometry args={[box.length, box.height, box.width]} />
          <meshPhysicalMaterial transparent opacity={0.06} color="#dbeafe" clearcoat={1} metalness={0.2} roughness={0.05} />
          <Edges color="#7ea4d8" />
        </mesh>

        {placements.map((item) => (
          <PackedItem key={item.id} item={item} highlighted={item.id === highlightedItemId} />
        ))}
      </group>

      <gridHelper args={[220, 22, '#2d4f7a', '#153052']} position={[0, -0.1, 0]} />
      <OrbitControls enableDamping dampingFactor={0.08} minDistance={70} maxDistance={250} />
    </Canvas>
  );
}
