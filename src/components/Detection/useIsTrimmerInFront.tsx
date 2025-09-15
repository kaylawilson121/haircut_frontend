
import { useState } from 'react';
import * as THREE from 'three';

export function useIsTrimmerInFront() {
  const [isInFront, setIsInFront] = useState(false);

  // Create a function to check if trimmer is in front using bounding boxes
  const checkIsInFront = (
    headRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>,
    trimmerRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>
  ) => {
    if (!headRef.current?.getWorldBox || !trimmerRef.current?.getWorldBox) return false;

    // Get bounding boxes using the provided methods
    const headBoundingBox = headRef.current.getWorldBox();
    const trimmerBoundingBox = trimmerRef.current.getWorldBox();

    if (!headBoundingBox || !trimmerBoundingBox) return false;

    // Check if trimmer is completely in front of the head
    // "In front" means the trimmer's max Z is less than the head's min Z
    // (in Three.js, smaller Z values are closer to the camera/viewer)
    const isTrimmerInFront = trimmerBoundingBox.max.z < headBoundingBox.min.z;
    
    console.log("trimmerMaxZ < headMinZ:", 
      Number(trimmerBoundingBox.max.z.toFixed(2)), 
      " < ", 
      Number(headBoundingBox.min.z.toFixed(2))
    );
    
    setIsInFront(isTrimmerInFront);
    return isTrimmerInFront;
  };

  return { isInFront, setIsInFront, checkIsInFront };
}
