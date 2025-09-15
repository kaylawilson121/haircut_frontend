
// useTrimmerPosition.ts
import { useEffect, useState } from 'react';
import { PoseMap } from '../ThreeD/ThreeScene';
import { ModelsConfig } from '@/modelsConfig';

interface UseTrimmerPositionProps {
  poses: PoseMap | null;
  isOverrideEnabled: boolean;
  manualPosition?: [number, number, number];
}

export function useTrimmerPosition({ poses, isOverrideEnabled, manualPosition }: UseTrimmerPositionProps) {
  const [isTrimmerInFront, setIsTrimmerInFront] = useState(false);

  useEffect(() => {
    // Access the poses using the arucoMarkerId values from ModelsConfig
    const headPose = poses?.[ModelsConfig.HeadModel.arucoMarkerId];
    
    if (!headPose) {
      return; // No head data available
    }
    
    // Convert head position to the correct scale (meters)
    const headZ = headPose.position[2] / 100;
    
    // Determine trimmer Z position based on control mode
    let trimmerZ: number;
    
    if (isOverrideEnabled && manualPosition) {
      // For manual position, we need to apply correct scaling
      // Manual sliders are in a different scale - divide by 10 for proper comparison
      trimmerZ = manualPosition[2] / 10;
      console.log("Using manual position for trimmer Z:", trimmerZ, "original value:", manualPosition[2]);
    } else {
      // Using marker detection
      const trimmerPose = poses?.[ModelsConfig.TrimmerModel.arucoMarkerId];
      if (!trimmerPose) {
        return; // No trimmer data available
      }
      trimmerZ = trimmerPose.position[2] / 100;
      console.log("Using marker position for trimmer Z:", trimmerZ, "original value:", trimmerPose.position[2]);
    }

    console.log("Position comparison - Head Z:", headZ, "Trimmer Z:", trimmerZ);
    
    // Trimmer is in front of head when its Z position is LESS THAN the head's Z position
    // (in the Three.js coordinate system, smaller Z values are closer to the camera/viewer)
    const inFront = trimmerZ < headZ;
    console.log("Is trimmer in front?", inFront);
    
    setIsTrimmerInFront(inFront);
  }, [poses, isOverrideEnabled, manualPosition]);

  return { isTrimmerInFront };
}
