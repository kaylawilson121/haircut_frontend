
import { useFrame } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TrimmerInFrontCheckerProps {
  headRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>;
  trimmerRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>;
  onChange: (isInFront: boolean) => void;
}

const TrimmerInFrontChecker: React.FC<TrimmerInFrontCheckerProps> = ({ headRef, trimmerRef, onChange }) => {
  const { scene } = useThree();
  const headHelperRef = useRef<THREE.Box3Helper | null>(null);
  const trimmerHelperRef = useRef<THREE.Box3Helper | null>(null);
  const frameCount = useRef(0);
  const isInitialized = useRef(false);
  const [headBox] = useState(() => new THREE.Box3());
  const [trimmerBox] = useState(() => new THREE.Box3());
  const lastCheckTime = useRef(0);

  // Initialize helpers
  useEffect(() => {
    // //console.log("TrimmerInFrontChecker mounted");
    
    // Create bounding box helpers with visible colors
    const headHelper = new THREE.Box3Helper(headBox, new THREE.Color(0x00ff00));
    const trimmerHelper = new THREE.Box3Helper(trimmerBox, new THREE.Color(0xff0000));
    
    // Make helpers visible by setting material properties
    headHelper.material.depthTest = false;
    headHelper.material.transparent = true;
    headHelper.material.opacity = 0.75;
    headHelper.material.linewidth = 2;
    
    trimmerHelper.material.depthTest = false;
    trimmerHelper.material.transparent = true;
    trimmerHelper.material.opacity = 0.75;
    trimmerHelper.material.linewidth = 2;
    
    // Add helpers to the scene
    scene.add(headHelper);
    scene.add(trimmerHelper);
    
    headHelperRef.current = headHelper;
    trimmerHelperRef.current = trimmerHelper;
    
    // //console.log("Box helpers created with enhanced visibility");
    
    // Clean up helpers when component unmounts
    return () => {
      // //console.log("TrimmerInFrontChecker unmounted - cleaning up helpers");
      if (headHelperRef.current) {
        scene.remove(headHelperRef.current);
        headHelperRef.current = null;
      }
      if (trimmerHelperRef.current) {
        scene.remove(trimmerHelperRef.current);
        trimmerHelperRef.current = null;
      }
    };
  }, [scene, headBox, trimmerBox]);

  useFrame(() => {
    // Skip initial frames to ensure everything is properly loaded
    frameCount.current++;
    
    if (frameCount.current < 20) {
      return;
    }

    // Throttle checks to avoid excessive calculations (every 100ms)
    const now = Date.now();
    if (now - lastCheckTime.current < 100) {
      return;
    }
    lastCheckTime.current = now;

    // Make sure both refs exist and have the getWorldBox method
    const headRefCurrent = headRef.current;
    const trimmerRefCurrent = trimmerRef.current;
    
    if (!headRefCurrent?.getWorldBox || !trimmerRefCurrent?.getWorldBox) {
      //console.log("Missing getWorldBox method on refs:", {
      //   headHasMethod: !!headRefCurrent?.getWorldBox,
      //   trimmerHasMethod: !!trimmerRefCurrent?.getWorldBox
      // });
      return;
    }

    // Get world bounding boxes
    const headBoxWorld = headRefCurrent.getWorldBox();
    const trimmerBoxWorld = trimmerRefCurrent.getWorldBox();

    if (!headBoxWorld || !trimmerBoxWorld) {
      //console.log("Could not get world boxes:", {
      //   headBoxNull: !headBoxWorld,
      //   trimmerBoxNull: !trimmerBoxWorld
      // });
      return;
    }

    // Update the visualization boxes
    if (headHelperRef.current && headBoxWorld) {
      headBox.copy(headBoxWorld);
      headHelperRef.current.box = headBox;
      headHelperRef.current.visible = true;
      headHelperRef.current.updateMatrixWorld(true);
    }

    if (trimmerHelperRef.current && trimmerBoxWorld) {
      trimmerBox.copy(trimmerBoxWorld);
      trimmerHelperRef.current.box = trimmerBox;
      trimmerHelperRef.current.visible = true;
      trimmerHelperRef.current.updateMatrixWorld(true);
    }

    // Check if the trimmer is completely in front of the head along the Z-axis
    const isTrimmerInFront = trimmerBoxWorld.max.z < headBoxWorld.min.z;
    
    // Log values for debugging
    if (!isInitialized.current || frameCount.current % 60 === 0) {
      //console.log("Head box Z range:", headBoxWorld.min.z.toFixed(2), "to", headBoxWorld.max.z.toFixed(2));
      //console.log("Trimmer box Z range:", trimmerBoxWorld.min.z.toFixed(2), "to", trimmerBoxWorld.max.z.toFixed(2));
      //console.log("Is trimmer in front:", isTrimmerInFront);
      isInitialized.current = true;
    }
    
    // Notify the parent component
    onChange(isTrimmerInFront);
  });

  return null;
};

export default TrimmerInFrontChecker;
