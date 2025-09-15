
import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const GridLabels: React.FC = () => {
  // Create labels for each unit on the axes
  const axisLabels = [];
  const range = 10; // Range of labels to display on each axis
  const skip = 2; // Skip every N units to avoid overcrowding

  // X axis labels (red)
  for (let i = -range; i <= range; i += skip) {
    if (i === 0) continue; // Skip origin as it will be marked with color-coded axes
    axisLabels.push(
      <Html key={`x-${i}`} position={[i, 0.1, 0]} style={{ color: 'red', fontSize: '0.6rem' }}>
        <div className="px-1 py-0.5 bg-black/50 rounded whitespace-nowrap">
          {i}
        </div>
      </Html>
    );
  }

  // Z axis labels (blue)
  for (let i = -range; i <= range; i += skip) {
    if (i === 0) continue; // Skip origin
    axisLabels.push(
      <Html key={`z-${i}`} position={[0, 0.1, i]} style={{ color: 'blue', fontSize: '0.6rem' }}>
        <div className="px-1 py-0.5 bg-black/50 rounded whitespace-nowrap">
          {i}
        </div>
      </Html>
    );
  }

  // Add colored axes to visualize the coordinate system
  return (
    <group>
      {axisLabels}
      
      {/* Origin label */}
      <Html position={[0, 0.1, 0]} style={{ color: 'white', fontSize: '0.6rem' }}>
        <div className="px-1 py-0.5 bg-black/50 rounded whitespace-nowrap">
          (0,0,0)
        </div>
      </Html>
      
      {/* Coordinate system axes */}
      <arrowHelper 
        args={[
          new THREE.Vector3(1, 0, 0), // Direction
          new THREE.Vector3(0, 0, 0), // Origin
          5, // Length
          0xff0000, // Color: red for X axis
          0.3, // Head length
          0.2  // Head width
        ]}
      />
      <arrowHelper 
        args={[
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, 0, 0),
          5,
          0x00ff00, // Green for Y axis
          0.3,
          0.2
        ]}
      />
      <arrowHelper 
        args={[
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 0, 0),
          5,
          0x0000ff, // Blue for Z axis
          0.3,
          0.2
        ]}
      />
    </group>
  );
};

export default GridLabels;
