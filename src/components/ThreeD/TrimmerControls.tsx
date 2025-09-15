import React from 'react';
import { useControls } from 'leva';

interface TrimmerControlsProps {
  isOverrideEnabled: boolean;
  onOverrideChange: (enabled: boolean) => void;
  position: [number, number, number];
  rotation: [number, number, number];
  onPositionChange: (axis: 'x' | 'y' | 'z', value: number) => void;
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

const TrimmerControls: React.FC<TrimmerControlsProps> = ({
  isOverrideEnabled,
  onOverrideChange,
  position,
  rotation,
  onPositionChange,
  onRotationChange,
}) => {
  useControls('Trimmer Controls', {
    overrideEnabled: {
      value: isOverrideEnabled,
      onChange: (value) => onOverrideChange(value),
    },
    posX: {
      value: position[0],
      min: -200,
      max: 200,
      step: 0.1,
      onChange: (value) => onPositionChange('x', value),
    },
    posY: {
      value: position[1],
      min: -200,
      max: 200,
      step: 0.1,
      onChange: (value) => onPositionChange('y', value),
    },
    posZ: {
      value: position[2],
      min: -200,
      max: 200,
      step: 0.1,
      onChange: (value) => onPositionChange('z', value),
    },
    rotX: {
      value: rotation[0],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('x', (value * Math.PI) / 180),
    },
    rotY: {
      value: rotation[1],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('y', (value * Math.PI) / 180),
    },
    rotZ: {
      value: rotation[2],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('z', (value * Math.PI) / 180),
    },
  });

  return null; // Leva automatically renders the controls in a GUI
};

export default TrimmerControls;