
import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useIsTrimmerInFront } from '../Detection/useIsTrimmerInFront';

interface TrimmerDetectorProps {
  headRef: React.RefObject<THREE.Object3D>;
  trimmerRef: React.RefObject<THREE.Object3D>;
}

// This component doesn't render anything visual, it just runs the position check on each frame
const TrimmerDetector: React.FC<TrimmerDetectorProps> = ({ headRef, trimmerRef }) => {
  const { checkIsInFront } = useIsTrimmerInFront();
  
  // useFrame is safely used inside a component that will be rendered within Canvas
  useFrame(() => {
    checkIsInFront(headRef, trimmerRef);
  });
  
  // This component doesn't render anything
  return null;
};

export default TrimmerDetector;
