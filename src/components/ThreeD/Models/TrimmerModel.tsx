
import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import { toast } from '@/components/ui/use-toast';
import { ModelsConfig } from '@/modelsConfig';
import { useHeadSurfacePosition } from '@/utils/useHeadSurfacePosition';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

interface TrimmerModelProps {
  headPose: {
    position: [number, number, number];
    rotation: [number, number, number];
  } | null;
  trimmerPose: {
    position: [number, number, number];
    rotation: [number, number, number];
  } | null;
  isTrimmerInFront: boolean;
  isTrimmerTouching: boolean;
}

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const TrimmerModel = React.forwardRef<THREE.Group, TrimmerModelProps>(
  ({ trimmerPose, isTrimmerInFront, isTrimmerTouching, headPose }, ref) => {
    const meshRef = useRef<THREE.Group>(null);
    const worldBoxRef = useRef<THREE.Box3>(new THREE.Box3());
    const [modelLoaded, setModelLoaded] = useState(false);
    const { calculateSurfacePosition } = useHeadSurfacePosition();
    const [initialBox, setInitialBox] = useState<THREE.Box3 | null>(null);
    const modelCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const [objCentered, setObjCentered] = useState(false);
    const cylinderRef = useRef<THREE.Mesh | null>(null);

    // Load the 3D model
    const obj = useLoader(
      OBJLoader,
      ModelsConfig.TrimmerModel.modelPath.replace("Hair_Trimmer.OBJ", "Hair_Trimmer.obj")
    );
    const head = useLoader(
      PLYLoader,
      ModelsConfig.HeadModelV2.modelPath.replace("3d_head.PLY", "3d_head.ply")
    );

    // Expose methods through ref
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

    // Initialize the model once it's loaded
    useEffect(() => {
      if (obj && meshRef.current && !objCentered) {
        setModelLoaded(true);
        toast({
          title: `${ModelsConfig.TrimmerModel.name} 3D Model loaded successfully`,
          description: `Visualizing the ${ModelsConfig.TrimmerModel.name} now`,
        });
        // Calculate model's bounding box and center
        const localBox = new THREE.Box3().setFromObject(obj);
        const modelCenter = new THREE.Vector3();
        localBox.getCenter(modelCenter);
        
        // Log important values for debugging
        //console.log("Trimmer bounding box before centering:", localBox);
        //console.log("Trimmer center before centering:", modelCenter);
        
        // Store the model center for future reference
        modelCenterRef.current = modelCenter.clone();

        // Create a clean clone of the object that we'll center
        const centeredObj = obj.clone();
        
        // Center the object's geometry around its own origin for proper rotation
        centeredObj.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z);

        // Apply materials to the centered object
        centeredObj.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x333333,
              roughness: 0.3,
              metalness: 0.8,
            });
          }
        });
        
        // Calculate new bounding box for the centered object
        const centeredBox = new THREE.Box3().setFromObject(centeredObj);
        //console.log("Trimmer bounding box after centering:", centeredBox);
        
        // Save the initial box for later use
        setInitialBox(centeredBox);
        
        // Replace the original object in the ref with the centered one
        if (meshRef.current) {
          // Remove any existing children
          while (meshRef.current.children.length > 0) {
            meshRef.current.remove(meshRef.current.children[0]);
          }
          // Add the centered object
          meshRef.current.add(centeredObj);

          // Wrap the loaded head geometry in a Mesh before adding
          if (head) {
            //console.log(head);
            const headMaterial = new THREE.MeshStandardMaterial({
              color: 0xDDBEA9, // Skin-like color
              roughness: 0.7,
              metalness: 0.1,
            });
            const headMesh = new THREE.Mesh(head, headMaterial);
            headMesh.name = "HeadModel";
            meshRef.current.add(headMesh);
            //console.log("Head model added to the scene");
            headMesh.updateMatrixWorld(true);
            headMesh.geometry.computeBoundingBox();
            headMesh.geometry.computeBoundingSphere();
            headMesh.geometry.computeVertexNormals();
            headMesh.geometry.attributes.position.needsUpdate = true;
            headMesh.geometry.attributes.normal.needsUpdate = true;
            headMesh.position.set(0, 0, 0);
            const cylGeom = new THREE.BoxGeometry(4, 4, 1);
            const cylMat = new THREE.MeshStandardMaterial({
              color: 0xff4444,
              roughness: 0.5,
              metalness: 0.2,
              transparent: true,
              opacity: 0.95,
            });
            const cylinder = new THREE.Mesh(cylGeom, cylMat);
            cylinder.name = "TrimmerCylinder";
            // Position the cylinder relative to the trimmer origin. Adjust these values to fit your model.
            cylinder.position.set(0, 0, 0.15); // move it in front of trimmer along local Z
            // Default cylinder axis is Y; rotate if you need it aligned differently relative to the trimmer
            // cylinder.rotation.set(Math.PI / 2, 0, 0); // example to rotate cylinder to point along X
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            cylinderRef.current = cylinder;
            meshRef.current.add(cylinder);
            meshRef.current.name = "TrimmerModel";
            setObjCentered(true);
          }
          meshRef.current.name = "TrimmerModel";
          setObjCentered(true);
        }
      }
    }, [obj, objCentered]);

    // Update position and rotation on each frame
    useFrame(() => {
      if (!meshRef.current || !trimmerPose || !initialBox) return;
    
      // Calculate new position based on the trimmer pose
      let newPosition: [number, number, number] = [
        -trimmerPose.position[0] / 30, // Invert X to match mirrored view
        trimmerPose.position[1] / 30,
        trimmerPose.position[2] / 30,
      ];
    
      // Adjust position when trimmer is touching the head
      if (isTrimmerInFront && isTrimmerTouching && headPose) {
        const headPosition: [number, number, number] = [
          -headPose.position[0] / 100,
          headPose.position[1] / 100,
          headPose.position[2] / 100,
        ];
    
        const surfacePosition = calculateSurfacePosition(newPosition, headPosition);
        if (surfacePosition) {
          newPosition = surfacePosition;
        }
      }
    
      // Apply position
      meshRef.current.position.set(newPosition[0], newPosition[1], newPosition[2]);
      
      // Apply rotation in proper order
      const rotX = trimmerPose.rotation[0];
      const rotY = trimmerPose.rotation[1];
      const rotZ = trimmerPose.rotation[2];
      
      meshRef.current.rotation.set(rotX, rotY, rotZ);
      
      // Update matrix world for accurate bounding box calculation
      meshRef.current.updateMatrixWorld(true);
    
      // Update the world bounding box
      if (initialBox && meshRef.current) {
        // Transform the initial box with the current world matrix
        const worldBox = initialBox.clone().applyMatrix4(meshRef.current.matrixWorld);
        worldBoxRef.current.copy(worldBox);
        
        // Log occasionally to avoid console spam
        if (Math.random() < 0.01) {
          //console.log("Trimmer world box updated:", 
          //   {
          //     min: { x: worldBox.min.x.toFixed(2), y: worldBox.min.y.toFixed(2), z: worldBox.min.z.toFixed(2) },
          //     max: { x: worldBox.max.x.toFixed(2), y: worldBox.max.y.toFixed(2), z: worldBox.max.z.toFixed(2) }
          //   }
          // );
        }
      }
    });

    // Return an empty group if obj isn't loaded yet
    if (!obj) return null;

    return (
      <group 
        ref={meshRef} 
        name="TrimmerModel" 
        scale={ModelsConfig.TrimmerModel.scale} 
        visible = {true}
      />
    );
  }
);

TrimmerModel.displayName = "TrimmerModel";

export default TrimmerModel;
