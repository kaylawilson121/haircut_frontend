# 3D Haircut Preview Application

A React-based web application that allows users to create and visualize 3D head models with AR tracking and photo upload capabilities.

## Features

### 1. Photo Upload & Processing

- Multi-angle photo capture (Front, Left, Right sides)
- Camera preview integration using Capacitor
- Image processing and segmentation
- Progress tracking for model generation
- Support for both camera capture and file upload

### 2. 3D Visualization

#### ThreeWorld Component

- Split-screen view showing both whole head and bald models
- Independent camera controls for each view
- Environment lighting and shadows
- Model scaling and positioning controls

#### ThreeScene Component

- Real-time AR tracking using Aruco markers
- Face mesh tracking using MediaPipe
- Interactive 3D model manipulation
- Debug panel for pose information
- Trimmer tool visualization and interaction

### 3. Model Management

- Supports both default and custom GLTF models
- Real-time model switching
- Material preservation from original models
- Shadow and lighting optimization

## Technical Stack

- React + TypeScript
- Three.js + React Three Fiber
- @react-three/drei for 3D utilities
- MediaPipe for face tracking
- Capacitor for camera integration
- TailwindCSS for styling

## Key Components

1. **PhotoUpload**
   - Manages photo capture and upload
   - Handles model generation process
   - Progress tracking and UI feedback

2. **ThreeScene**
   - Main AR visualization component
   - Handles marker-based tracking
   - Manages 3D model rendering and pose updates

3. **HeadModel**
   - Handles 3D head model loading and rendering
   - Integrates face tracking
   - Manages model transformations and materials

4. **ThreeWorld**
   - Split-view 3D model preview
   - Independent camera controls
   - Environment and lighting setup

## Installation

```bash
npm install
# or
yarn install
```

## Development

```bash
npm run dev
# or
yarn dev
```

## Building

```bash
npm run build
# or
yarn build
```

## Environment Setup

Required environment variables:

- Backend API endpoints for model processing
- MediaPipe face mesh configuration
- Camera preview settings

## Notes

- Camera permissions required for AR features
- WebGL support required for 3D rendering
- Network connection required for model processing
