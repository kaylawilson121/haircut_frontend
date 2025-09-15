
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import type { Mesh } from 'three';
import { toast } from '@/components/ui/use-toast';
import * as THREE from 'three';
import { ModelsConfig } from '@/modelsConfig';

interface HeadModelProps {
  pose: {
    position: [number, number, number];
    rotation: [number, number, number];
  } | null;
  setCameraDistance: (distance: number) => void;
}

const HeadModel = React.forwardRef<THREE.Group, HeadModelProps>(
  ({ pose, setCameraDistance }, ref) => {
    const meshRef = useRef<THREE.Group>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const worldBoxRef = useRef<THREE.Box3>(new THREE.Box3());
    const [initialBox, setInitialBox] = useState<THREE.Box3 | null>(null);
    const modelCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const [objCentered, setObjCentered] = useState(false);
    
    // Use useLoader for the OBJ file, handling errors properly
    const obj = useLoader(
      OBJLoader, 
      ModelsConfig.HeadModel.modelPath,
      undefined,  // No extensions
      (event) => {
        // This is a progress event, not an error
        //console.log(`Loading [${ModelsConfig.HeadModel.modelPath}] 3D model...`, event.loaded / event.total * 100, '%');
      }
    );

    // Imperative handle to expose the getWorldBox method
    React.useImperativeHandle(ref, () => {
      if (!meshRef.current) {
        return null as unknown as THREE.Group;
      }
      
      return Object.assign(meshRef.current, {
        getWorldBox: () => {
          // Only return the worldBox if we have initialBox
          if (initialBox && meshRef.current) {
            // Create a fresh box for each call to avoid stale references
            return initialBox.clone().applyMatrix4(meshRef.current.matrixWorld);
          }
          return null;
        }
      }) as THREE.Group;
    }, [meshRef.current, initialBox]);

    const calculateCameraDistance = (box: THREE.Box3, size: THREE.Vector3) => {
      // Calculate cameraZ based on the model size
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = 35; // same as your canvas
      const cameraDistance = maxDim / (2 * Math.tan((Math.PI * fov) / 360)) * 1000; // in scene units
      
      // Store the model center to use for rotation
      modelCenterRef.current = center.clone();
      
      // Update parent component's state
      setCameraDistance(cameraDistance);
      
      // Optional: You can still log the value
      //console.log("Suggested camera Z distance:", cameraDistance);
    }

    // Set model as loaded when obj is available
    useEffect(() => {
      if (obj && meshRef.current && !objCentered) {
        setModelLoaded(true);
        toast({
          title: `${ModelsConfig.HeadModel.name} 3D Model loaded successfully`,
          description: `Visualizing the ${ModelsConfig.HeadModel.name} now`,
        });
        
        // Calculate model size and appropriate camera distance
        const localBox = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        localBox.getSize(size);
        //console.log(`${ModelsConfig.HeadModel.name} size in units:`, size);

        // Calculate the center of the model
        const modelCenter = new THREE.Vector3();
        localBox.getCenter(modelCenter);
        //console.log("Head model center:", modelCenter);
        
        // Create a clean clone of the object
        const centeredObj = obj.clone();
        
        // Center the object's geometry around its own origin for proper rotation
        centeredObj.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z);
        
        // Apply materials to the centered object
        centeredObj.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xDDBEA9, // Skin-like color
              roughness: 0.7,
              metalness: 0.1,
            });
          }
        });
        
        // Calculate the accurate bounding box for the centered object
        const centeredLocalBox = new THREE.Box3().setFromObject(centeredObj);
        //console.log("Head centered box:", centeredLocalBox);
        
        // Save the initial box for later use
        setInitialBox(centeredLocalBox);
        
        // Store the model center for future reference
        modelCenterRef.current = modelCenter.clone();

        // Set name for the object for easy reference in ray casting
        centeredObj.name = "HeadModel";
        
        // Replace the original object in the ref with the centered one
        if (meshRef.current) {
          // Remove any existing children
          while (meshRef.current.children.length > 0) {
            meshRef.current.remove(meshRef.current.children[0]);
          }
          
          // Add the centered object
          meshRef.current.add(centeredObj);
          meshRef.current.name = "HeadModel";
          setObjCentered(true);
        }
        
        calculateCameraDistance(centeredLocalBox, size);
      }
    }, [obj, setCameraDistance, objCentered]);

    useFrame(() => {
      if (!meshRef.current || !pose || !initialBox) return;
    
      // Position: pose.position is in centimeters, convert to meters and invert X because camera view is mirrored
      meshRef.current.position.set(
        -pose.position[0] / 100, 
        pose.position[1] / 100, 
        pose.position[2] / 100
      );

      // Rotation: convert degrees to radians and invert X and Y axis to match Three.js coordinate system
      const degToRad = (deg: number) => (deg * Math.PI) / 180;
      meshRef.current.rotation.set(
        degToRad(-pose.rotation[0]),
        degToRad(-pose.rotation[1]),
        degToRad(pose.rotation[2])
      );
      
      // Update world matrix
      meshRef.current.updateMatrixWorld(true);
      
      // Update the world box and log it if initialBox is defined
      if (initialBox) {
        // Apply the current world matrix to the initial box to get the current world box
        const worldBox = initialBox.clone().applyMatrix4(meshRef.current.matrixWorld);
        worldBoxRef.current.copy(worldBox);
        
        // Log only occasionally to avoid spamming the console
        if (Math.random() < 0.01) {
          //console.log("Head world box updated:", 
          //   {
          //     min: { x: worldBox.min.x.toFixed(2), y: worldBox.min.y.toFixed(2), z: worldBox.min.z.toFixed(2) },
          //     max: { x: worldBox.max.x.toFixed(2), y: worldBox.max.y.toFixed(2), z: worldBox.max.z.toFixed(2) }
          //   }
          // );
        }
      }
    });

    if (!obj) {
      return null;
    }
    
    return (
      <group 
        ref={meshRef} 
        name="HeadModel"
        scale={ModelsConfig.HeadModel.scale}
        visible = {false}
      />
    );
  }
);

HeadModel.displayName = "HeadModel";

export default HeadModel;
