
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface FallbackCubeProps {
  pose: {
    position: [number, number, number];
    rotation: [number, number, number];
  } | null;
}

// Fallback cube component
const FallbackCube: React.FC<FallbackCubeProps> = ({ pose }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current && pose) {
      // Position: pose.position is in centimeters, convert to meters and invert X because camera view is mirrored
      meshRef.current.position.set(-pose.position[0] / 100, pose.position[1] / 100, pose.position[2] / 100);

      // Rotation: convert degrees to radians and invert X and Y axis to match Three.js coordinate system
      const degToRad = (deg: number) => (deg * Math.PI) / 180;
      meshRef.current.rotation.set(
        degToRad(-pose.rotation[0]),
        degToRad(-pose.rotation[1]),
        degToRad(pose.rotation[2])
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" args={[{ color: '#ea384c', wireframe: true }]} />
    </mesh>
  );
};

export default FallbackCube;
