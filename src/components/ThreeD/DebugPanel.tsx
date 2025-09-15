
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IS_TRIMMER_TOUCHING_KEY } from '@/peripherals/useKeyboardControls';
import * as THREE from 'three';

interface DebugPanelProps {
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
  headRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>;
  trimmerRef: React.RefObject<THREE.Object3D & { getWorldBox?: () => THREE.Box3 }>;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  headPose, 
  trimmerPose,
  isTrimmerInFront,
  isTrimmerTouching,
  headRef,
  trimmerRef,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [headDetected, setHeadDetected] = useState(false);
  const [trimmerDetected, setTrimmerDetected] = useState(false);
  const roundValue = (value: number) => Math.round(value * 100) / 100;

  const [headBox, setHeadBox] = useState<THREE.Box3 | null>(null);
  const [trimmerBox, setTrimmerBox] = useState<THREE.Box3 | null>(null);

  // Update detection status and boxes on each render
  useEffect(() => {
    // Check if head is detected based on pose and ref
    setHeadDetected(!!headPose && !!headRef.current);
    
    // Check if trimmer is detected based on pose and ref
    setTrimmerDetected(!!trimmerPose && !!trimmerRef.current);

    // Get latest bounding boxes if available
    if (headRef.current?.getWorldBox) {
      const currentHeadBox = headRef.current.getWorldBox();
      if (currentHeadBox) {
        setHeadBox(currentHeadBox);
      }
    }

    if (trimmerRef.current?.getWorldBox) {
      const currentTrimmerBox = trimmerRef.current.getWorldBox();
      if (currentTrimmerBox) {
        setTrimmerBox(currentTrimmerBox);
      }
    }

    // Refresh every 100ms
    const timer = setInterval(() => {
      if (headRef.current?.getWorldBox) {
        const currentHeadBox = headRef.current.getWorldBox();
        if (currentHeadBox) {
          setHeadBox(currentHeadBox);
        }
      }

      if (trimmerRef.current?.getWorldBox) {
        const currentTrimmerBox = trimmerRef.current.getWorldBox();
        if (currentTrimmerBox) {
          setTrimmerBox(currentTrimmerBox);
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [headPose, trimmerPose, headRef, trimmerRef]);

  return (
    <div className="absolute top-2 right-2 z-10 w-72">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-black/80 text-white border-gray-800">
          <CardHeader className="p-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs">Debug Values</CardTitle>
              <CollapsibleTrigger className="p-1">
                {isOpen ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-2 p-2 text-xs">
              <div>
                <h3 className="font-bold mb-1">Head</h3>
                {headPose ? (
                  <div>
                    <div className={`${headDetected ? 'text-green-400' : 'text-red-400'}`}>
                      Head detected: {headDetected ? 'Yes' : 'No'}
                    </div>
                    <div>
                      Rotation: [{roundValue(headPose.rotation[0])}, {roundValue(headPose.rotation[1])}, {roundValue(headPose.rotation[2])}]
                    </div>
                    {headBox && (
                      <div className="mt-1 text-gray-300">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th></th>
                              <th className="text-left">Min</th>
                              <th className="text-left">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>X:</td>
                              <td>{roundValue(headBox.min.x)}</td>
                              <td>{roundValue(headBox.max.x)}</td>
                            </tr>
                            <tr>
                              <td>Y:</td>
                              <td>{roundValue(headBox.min.y)}</td>
                              <td>{roundValue(headBox.max.y)}</td>
                            </tr>
                            <tr>
                              <td>Z:</td>
                              <td>{roundValue(headBox.min.z)}</td>
                              <td>{roundValue(headBox.max.z)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400">No head detected</div>
                )}
              </div>

              <div>
                <h3 className="font-bold mb-1">Trimmer</h3>
                {trimmerPose ? (
                  <>
                    <div className={`${trimmerDetected ? 'text-green-400' : 'text-red-400'}`}>
                      Trimmer detected: {trimmerDetected ? 'Yes' : 'No'}
                    </div>
                    <div>
                      Pos: [{roundValue(trimmerPose.position[0])}, {roundValue(trimmerPose.position[1])}, {roundValue(trimmerPose.position[2])}]
                    </div>
                    <div>
                      Rot: [{roundValue(trimmerPose.rotation[0] / Math.PI * 180)}, {roundValue(trimmerPose.rotation[1] / Math.PI * 180)}, {roundValue(trimmerPose.rotation[2] / Math.PI * 180)}]
                    </div>
                    {trimmerBox && (
                      <div className="mt-1 text-gray-300">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th></th>
                              <th className="text-left">Min</th>
                              <th className="text-left">Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>X:</td>
                              <td>{roundValue(trimmerBox.min.x)}</td>
                              <td>{roundValue(trimmerBox.max.x)}</td>
                            </tr>
                            <tr>
                              <td>Y:</td>
                              <td>{roundValue(trimmerBox.min.y)}</td>
                              <td>{roundValue(trimmerBox.max.y)}</td>
                            </tr>
                            <tr>
                              <td>Z:</td>
                              <td>{roundValue(trimmerBox.min.z)}</td>
                              <td>{roundValue(trimmerBox.max.z)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400">No trimmer detected</div>
                )}
              </div>

              <div>
                <h3 className="font-bold mb-1">Status</h3>
                <div className={`${(trimmerRef.current == null) ? 'text-red-400' : 'text-green-400'}`}>
                  DebugMesh loaded: {(trimmerRef.current != null) ? 'Yes' : 'No'}
                </div>
                <div className={`${isTrimmerInFront ? 'text-green-400' : 'text-red-400'}`}>
                  Trimmer in front: {isTrimmerInFront ? 'Yes' : 'No'}
                </div>
                <div className={`${isTrimmerTouching ? 'text-green-400' : 'text-red-400'}`}>
                  Trimmer touching: {isTrimmerTouching ? 'Yes' : 'No'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  (Press '{IS_TRIMMER_TOUCHING_KEY}' to simulate touch)
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default DebugPanel;
