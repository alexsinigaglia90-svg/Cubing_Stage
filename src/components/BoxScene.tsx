import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Edges, Html } from '@react-three/drei';
import type { BoxDimensions, Placement } from '../types';

interface BoxSceneProps {
  box: BoxDimensions;
  placements: Placement[];
  highlightedItemId?: string;
}

function PackedItem({ item, highlighted }: { item: Placement; highlighted: boolean }) {
  const makeMaterial = () => (
    <meshStandardMaterial
      color={item.color}
      emissive={highlighted ? '#7cb8ff' : '#000000'}
      emissiveIntensity={highlighted ? 0.45 : 0}
      transparent
      opacity={item.visualType === 'shoe' ? (highlighted ? 1 : 0.92) : 0.9}
      metalness={item.visualType === 'shoe' ? 0.32 : 0.18}
      roughness={item.visualType === 'cap' ? 0.55 : 0.3}
    />
  );

  const renderLabel = () => {
    if (item.visualType === 'shoe') return item.id.replace('shoe-', '#');
    if (item.visualType === 'tshirt') return 'TEE';
    if (item.visualType === 'accessory') return 'ACC';
    return 'CAP';
  };

  return (
    <group position={[item.position[0], item.position[2], item.position[1]]} scale={highlighted ? 1.04 : 1}>
      {item.visualType === 'cap' ? (
        <>
          <mesh position={[0, -item.size[2] * 0.12, 0]}>
            <cylinderGeometry args={[item.size[0] * 0.4, item.size[0] * 0.4, item.size[2] * 0.12, 28]} />
            {makeMaterial()}
          </mesh>
          <mesh position={[0, item.size[2] * 0.2, 0]}>
            <cylinderGeometry args={[item.size[0] * 0.22, item.size[0] * 0.3, item.size[2] * 0.55, 28, 1, true]} />
            {makeMaterial()}
          </mesh>
        </>
      ) : (
        <mesh>
          <boxGeometry args={[item.size[0], item.size[2], item.size[1]]} />
          {makeMaterial()}
          <Edges color="#e6eefc" threshold={14} />
        </mesh>
      )}
      {item.visualType === 'shoe' || item.visualType === 'cap' || item.visualType === 'tshirt' ? (
        <Html distanceFactor={11} center>
          <div className={`cube-label ${highlighted ? 'active' : ''}`}>{renderLabel()}</div>
        </Html>
      ) : null}
    </group>
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
