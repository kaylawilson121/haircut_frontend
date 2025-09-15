
import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import HeadModel from './Models/HeadModel';
import TrimmerModel from './Models/TrimmerModel';
import FallbackCube from './FallbackCube';
import SceneLabels from './SceneLabels';
import TrimmerControls from './TrimmerControls';
import HeadControls from './HeadControls';
import { ModelsConfig } from '@/modelsConfig';
import DebugPanel from './DebugPanel';
import { useTrimmerPosition } from '../Detection/useTrimmerPosition';
import { useSceneControls } from '@/peripherals/useKeyboardControls';
import { useIsTrimmerInFront } from '../Detection/useIsTrimmerInFront';
import TrimmerInFrontChecker from './meshCalculation/TrimmerInFrontChecker';
import GridLabels from './GridLabels';
import * as THREE from 'three';

export interface PoseMap {
  [markerId: number]: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
}

export interface ThreeSceneProps {
  poses: PoseMap | null;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ poses }) => {
  const headRef = useRef<THREE.Group>(null);
  const trimmerRef = useRef<THREE.Group>(null);
  const [cameraDistance, setCameraDistance] = useState(0);
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
  const [manualPosition, setManualPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [manualRotation, setManualRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [isTrimmerInFrontOfHead, setIsTrimmerInFrontOfHead] = useState(false);
  
  // Head override state
  const [isHeadOverrideEnabled, setIsHeadOverrideEnabled] = useState(false);
  const [headManualRotation, setHeadManualRotation] = useState<[number, number, number]>([0, 0, 0]);
  
  const { showFallback, isTrimmerTouching } = useSceneControls();

  const headPose = isHeadOverrideEnabled 
    ? { position: poses?.[ModelsConfig.HeadModel.arucoMarkerId]?.position || [0, 0, 0], rotation: headManualRotation }
    : poses?.[ModelsConfig.HeadModel.arucoMarkerId] || null;
    
  const trimmerPose = isOverrideEnabled 
    ? { position: manualPosition, rotation: manualRotation }
    : poses?.[ModelsConfig.TrimmerModel.arucoMarkerId] || null;
  
  const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const newPosition: [number, number, number] = [...manualPosition];
    newPosition[axisIndex] = value;
    setManualPosition(newPosition);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const newRotation: [number, number, number] = [...manualRotation];
    newRotation[axisIndex] = value;
    setManualRotation(newRotation);
  };

  const handleHeadRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const newRotation: [number, number, number] = [...headManualRotation];
    newRotation[axisIndex] = value;
    setHeadManualRotation(newRotation);
  };

  return (
    <div className="relative w-full">
      <DebugPanel 
        headPose={headPose} 
        trimmerPose={trimmerPose}
        isTrimmerInFront={isTrimmerInFrontOfHead}
        isTrimmerTouching={isTrimmerTouching}
        headRef={headRef}
        trimmerRef={trimmerRef}
      />
      
      <TrimmerControls
        isOverrideEnabled={isOverrideEnabled}
        onOverrideChange={setIsOverrideEnabled}
        position={manualPosition}
        rotation={manualRotation}
        onPositionChange={handlePositionChange}
        onRotationChange={handleRotationChange}
      />

      <HeadControls
        isOverrideEnabled={isHeadOverrideEnabled}
        onOverrideChange={setIsHeadOverrideEnabled}
        rotation={headManualRotation}
        onRotationChange={handleHeadRotationChange}
      />

      <Canvas
        style={{ height: 600, width: '100%', background: '#1A1F2C' }}
        camera={{ position: [0, 5, 15] }}
      >
        <ambientLight intensity={1.2} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        <directionalLight position={[-5, 5, 5]} intensity={1.5} color="white" />
        <directionalLight position={[5, -5, 5]} intensity={0.8} color="#ffaa77" />

        <Grid 
          infiniteGrid 
          cellSize={0.5}
          sectionSize={1}
          fadeDistance={20} 
          fadeStrength={1}
        />
        
        <GridLabels />
        <SceneLabels />

        <OrbitControls 
          enablePan
          enableZoom
          enableRotate
          maxDistance={20}
          minDistance={1}
          target={new THREE.Vector3(0, 0, 0)}
        />

        <TrimmerInFrontChecker headRef={headRef} trimmerRef={trimmerRef} onChange={setIsTrimmerInFrontOfHead} />

        <Suspense fallback={headPose ? <FallbackCube pose={headPose} /> : null}>
          <axesHelper args={[5]} />
          
          <HeadModel ref={headRef} pose={headPose} setCameraDistance={setCameraDistance} />
          <TrimmerModel 
            ref={trimmerRef}
            headPose={headPose} 
            trimmerPose={trimmerPose} 
            isTrimmerInFront={isTrimmerInFrontOfHead}
            isTrimmerTouching={isTrimmerTouching}
          />
        </Suspense>

        {showFallback && headPose && <FallbackCube pose={headPose} />}
      </Canvas>
    </div>
  );
};

export default ThreeScene;
