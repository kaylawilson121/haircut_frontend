import React from 'react';
import { useControls } from 'leva';

interface HeadControlsProps {
  isOverrideEnabled: boolean;
  onOverrideChange: (enabled: boolean) => void;
  rotation: [number, number, number];
  onRotationChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

const HeadControls: React.FC<HeadControlsProps> = ({
  isOverrideEnabled,
  onOverrideChange,
  rotation,
  onRotationChange,
}) => {
  useControls('Head Controls', {
    overrideEnabled: {
      value: isOverrideEnabled,
      onChange: (value) => onOverrideChange(value),
    },
    rotX: {
      value: rotation[0],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('x', value),
    },
    rotY: {
      value: rotation[1],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('y', value),
    },
    rotZ: {
      value: rotation[2],
      min: -180,
      max: 180,
      step: 1,
      onChange: (value) => onRotationChange('z', value),
    },
  });

  return null; // Leva automatically renders the controls in a GUI
};

export default HeadControls;