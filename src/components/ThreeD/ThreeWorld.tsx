import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree, createPortal } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

// Model component to load and render a GLTF model
type ModelProps = {
  modelUrl: string;
  scale: [number, number, number];
  position: [number, number, number];
};

const Model: React.FC<ModelProps> = ({ modelUrl, scale, position }) => {
  const [gltf, setGltf] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltfData) => {
      setGltf(gltfData.scene);
    });
  }, [modelUrl]);

  return gltf ? (
    <primitive object={gltf} scale={scale} position={position} />
  ) : null;
};

// ... existing ModelProps and ThreeWorldProps ...

type ThreeWorldProps = {
  baldModelUrl?: string;
  wholeModelUrl?: string;
};

const Scene = ({ ModelUrl, scale }) => {
  const camera1 = useRef();
  const camera2 = useRef();
  
  return (
    <>
      {/* First Camera and View */}
      <PerspectiveCamera
        ref={camera1}
        makeDefault
        position={[-2, 1, 3]}
        fov={50}
      />
      
      {/* Second Camera and View */}
      <PerspectiveCamera
        ref={camera2}
        position={[2, 1, 3]}
        fov={50}
      />

      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      
      {ModelUrl && <Model modelUrl={ModelUrl} scale={scale} position={[0, 0, 0]} />}
      
      {/* Separate OrbitControls for each camera */}
      <OrbitControls camera={camera1.current} makeDefault />
      <OrbitControls camera={camera2.current} />
      <Environment preset="sunset" />
    </>
  );
};

const ThreeWorld = ({ baldModelUrl, wholeModelUrl }: ThreeWorldProps) => {
  const [scale, setScale] = useState<[number, number, number]>([1, 1, 1]);

  return (
    <div className="w-full">
      {/* ... existing scale controls ... */}
      
      <div className="flex gap-4">
        {/* Left viewport */}
        <div className="w-1/2 h-[400px] bg-gray-900 rounded shadow">
          {(baldModelUrl || wholeModelUrl) ? (
            <Canvas>
              <Scene ModelUrl={wholeModelUrl} scale={scale} />
            </Canvas>
          ) : (
            <div className="text-white text-1xl sm:text-2xl font-extrabold flex items-center justify-center h-full">
              Upload a photo to build!
            </div>
          )}
        </div>
        
        {/* Right viewport */}
        <div className="w-1/2 h-[400px] bg-gray-900 rounded shadow">
          {(baldModelUrl || wholeModelUrl) ? (
            <Canvas>
              <Scene ModelUrl={baldModelUrl} scale={scale} />
            </Canvas>
          ) : (
            <div className="text-white text-1xl sm:text-2xl font-extrabold flex items-center justify-center h-full">
              Upload a photo to build!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreeWorld;