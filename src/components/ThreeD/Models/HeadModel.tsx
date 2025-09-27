import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type { Mesh } from 'three';
import { toast } from '@/components/ui/use-toast';
import * as THREE from 'three';
import { ModelsConfig } from '@/modelsConfig';
import { useGLTF } from '@react-three/drei';
import { FaceMesh } from "@mediapipe/face_mesh";
import { CameraPreview } from '@capacitor-community/camera-preview';
import { estimateHeadPoseFromLandmarks } from '@/utils/facePoseEstimator';
import { faceMeshService } from '@/utils/FaceMeshService';

interface HeadModelProps {
  pose: {
    position: [number, number, number];
    rotation: [number, number, number];
  } | null;
  setCameraDistance: (distance: number) => void;
  wholeModelUrl?: string | null;
}
let faceMesh;
const HeadModel = React.forwardRef<THREE.Group, HeadModelProps>(
  ({ pose, setCameraDistance, wholeModelUrl }, ref) => {
    const meshRef = useRef<THREE.Group>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const worldBoxRef = useRef<THREE.Box3>(new THREE.Box3());
    const [initialBox, setInitialBox] = useState<THREE.Box3 | null>(null);
    const modelCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const [objCentered, setObjCentered] = useState(false);

    // Load default model
    const defaultModel = useLoader(
      OBJLoader, 
      ModelsConfig.HeadModel.modelPath,
      undefined,  // No extensions
      (event) => {
        // This is a progress event, not an error
        //console.log(`Loading [${ModelsConfig.HeadModel.modelPath}] 3D model...`, event.loaded / event.total * 100, '%');
      }
    );

    const [customModel, setCustomModel] = useState<THREE.Group | null>(defaultModel);
    const [model, setModel] = useState<THREE.Group | null>(defaultModel);

    const cameraReadyRef = useRef<boolean>(false);
    const startingCameraRef = useRef<boolean>(false); // NEW: avoid double starts
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Add material constants
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0xDDBEA9,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide // Add this to render both sides
    });
    useEffect(() => {
      const initializeCamera = async () => {
        if (startingCameraRef.current) return; // already starting
        startingCameraRef.current = true;
        try {
          await CameraPreview.stop();
        } catch (stopErr) {
          // ignore stop errors
          console.warn('CameraPreview.stop() warning:', stopErr);
        }
  
        try {
          await CameraPreview.start({
            parent: "camera-preview",
            position: "rear",
            x: 60,
            y: 700,
            width: 600,
            height: 400,
            toBack: false,
            className: "",
          });
          setIsCameraReady(true);
          cameraReadyRef.current = true;
        } catch (startErr: any) {
          // ignore the "camera_already_started" error but surface others
          const msg = startErr?.message ?? String(startErr);
          if (msg && msg.includes('camera already started')) {
            console.warn('Camera already started, continuing.');
            setIsCameraReady(true);
            cameraReadyRef.current = true;
          } else {
            console.error('CameraPreview.start() failed:', startErr);
          }
        } finally {
          startingCameraRef.current = false;
        }
      };
      initializeCamera();
    }, [])

    // Load custom model when URL is provided
    useEffect(() => {
      if (!wholeModelUrl) {
        setCustomModel(null);
        return;
      }

      const loader = new GLTFLoader();
      loader.load(
        wholeModelUrl,
        (gltf) => {
          // Apply materials to all meshes in the GLTF
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              // child.material = defaultMaterial.clone();
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          setCustomModel(gltf.scene);
          setModel(gltf.scene);
          console.log("change model")
        },
        undefined,
        (error) => {
          console.error('Error loading custom head model:', error);
          setCustomModel(null);
        }
      );
    }, [wholeModelUrl]);

    // Use customModel if available, otherwise use defaultModel

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
      if (model && meshRef.current && !objCentered) {
        setModelLoaded(true);
        toast({
          title: `${ModelsConfig.HeadModel.name} 3D Model loaded successfully`,
          description: `Visualizing the ${ModelsConfig.HeadModel.name} now`,
        });
        
        // Calculate model size and appropriate camera distance
        const localBox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        localBox.getSize(size);
        //console.log(`${ModelsConfig.HeadModel.name} size in units:`, size);

        // Calculate the center of the model
        const modelCenter = new THREE.Vector3();
        localBox.getCenter(modelCenter);
        //console.log("Head model center:", modelCenter);
        
        // Create a clean clone of the object
        const centeredObj = model.clone();
        
        // Center the object's geometry around its own origin for proper rotation
        centeredObj.position.set(-modelCenter.x, -modelCenter.y, -modelCenter.z);
        
        // Apply materials and shadows
        centeredObj.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            // child.material = defaultMaterial.clone();
            child.castShadow = true;
            child.receiveShadow = true;
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
    }, [model, setCameraDistance, objCentered]);

    // Move useState hook to component level
    const [useFacePose, setUseFacePose] = useState<boolean>(true);
    const [landmark, setLandmark] = useState(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize FaceMesh
    useEffect(() => {
      const initFaceMesh = async () => {
        await faceMeshService.initialize((landmarks) => {
          setLandmark(landmarks);
        });
      };
      initFaceMesh();

      return () => {
        faceMeshService.dispose();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, []);

    const capture = async () => {
      if (!cameraReadyRef.current) return;
      
      try {
        const result = await CameraPreview.captureSample({ quality: 40 });
        if (!result?.value) return;

        const base64Value = result.value;
        const frameData = "data:image/jpeg;base64," + base64Value;
        
        // Create and process image
        const img = new Image();
        img.onload = async () => {
          await faceMeshService.processImage(img);
        };
        img.src = frameData;
      } catch (err) {
        console.warn('Capture error:', err);
      }
    };

    // Start capture loop
    useEffect(() => {
      intervalRef.current = setInterval(capture, 100);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [cameraReadyRef.current]);

    useFrame(() => {
      if (!meshRef.current || !initialBox) return;

      // derive face-based pose (from mediapipe landmarks) when points are available
      const facePose = (landmark && landmark.length > 0) 
        ? estimateHeadPoseFromLandmarks(landmark) 
        : null;

      const effectiveHeadPose = useFacePose && facePose ? facePose : pose;
      if (!effectiveHeadPose) return;

      meshRef.current.position.set(
        -effectiveHeadPose.position[0] / 100,
        effectiveHeadPose.position[1] / 100,
        effectiveHeadPose.position[2] / 100
      );

      const degToRad = (deg: number) => (deg * Math.PI) / 180;
      meshRef.current.rotation.set(
        degToRad(-effectiveHeadPose.rotation[0]),
        degToRad(-effectiveHeadPose.rotation[1]),
        degToRad(effectiveHeadPose.rotation[2])
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

    if (!model) {
      return null;
    }
    
    return (
      <group 
        ref={meshRef} 
        name="HeadModel"
        scale={ModelsConfig.HeadModel.scale}
        visible={true}
        castShadow
        receiveShadow
      />
    );
  }
);

HeadModel.displayName = "HeadModel";

export default HeadModel;
