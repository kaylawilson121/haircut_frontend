
import React from 'react';
import { Html } from '@react-three/drei';

const SceneLabels = () => {
  const labelStyle = {
    color: 'white',
    padding: '8px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '4px',
    fontSize: '14px'
  };

  return (
    <>
      {/* Left and Right labels */}
      <Html position={[-10, 0, 0]} style={labelStyle}>Left</Html>
      <Html position={[10, 0, 0]} style={labelStyle}>Right</Html>
      
      {/* Front and Back labels */}
      <Html position={[0, 0, 10]} style={labelStyle}>Front</Html>
      <Html position={[0, 0, -10]} style={labelStyle}>Back</Html>
    </>
  );
};

export default SceneLabels;
