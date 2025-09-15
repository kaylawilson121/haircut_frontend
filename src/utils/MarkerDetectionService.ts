
import * as THREE from "three"


interface ArUcoMarker {
  id: number
  corners: number[][]
  center: { x: number; y: number }
}

export interface MarkerPose {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  confidence: number
}

export interface Marker {
  id: number;
  corners: { x: number; y: number }[];
}

export interface Pose {
  position: [number, number, number];
  rotation: [number, number, number];
}

export const calculateMarkerPose = (marker: ArUcoMarker, imageWidth: number, imageHeight: number): Pose => {
  const corners = marker.corners

  // 3D model points (assuming marker is at z=0, size 1x1)
  const modelPoints = [
    new THREE.Vector3(-0.5,  0.5, 0), // top-left
    new THREE.Vector3( 0.5,  0.5, 0), // top-right
    new THREE.Vector3( 0.5, -0.5, 0), // bottom-right
    new THREE.Vector3(-0.5, -0.5, 0), // bottom-left
  ]

  // Convert 2D image points to normalized device coordinates (-1 to 1)
  const imagePoints = corners.map(([x, y]) =>
    new THREE.Vector3(
      (x / imageWidth - 0.5) * 2,
      -(y / imageHeight - 0.5) * 2,
      0
    )
  )

  // Compute vectors in image and model space
  const vModelX = new THREE.Vector3().subVectors(modelPoints[1], modelPoints[0])
  const vModelY = new THREE.Vector3().subVectors(modelPoints[3], modelPoints[0])
  const vImageX = new THREE.Vector3().subVectors(imagePoints[1], imagePoints[0])
  const vImageY = new THREE.Vector3().subVectors(imagePoints[3], imagePoints[0])

  // Estimate rotation using cross products
  const normalModel = new THREE.Vector3().crossVectors(vModelX, vModelY).normalize()
  const normalImage = new THREE.Vector3().crossVectors(vImageX, vImageY).normalize()

  // Find rotation quaternion from model normal to image normal
  const quaternion = new THREE.Quaternion().setFromUnitVectors(normalModel, normalImage)

  // Align X axis for more accuracy
  const vModelXRotated = vModelX.clone().applyQuaternion(quaternion)
  const alignQuat = new THREE.Quaternion().setFromUnitVectors(vModelXRotated.normalize(), vImageX.normalize())
  quaternion.multiply(alignQuat)

  // Convert quaternion to Euler angles (Three.js default order is 'XYZ')
  const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')

  // Calculate center position in normalized coordinates
  const centerX = (marker.center.x / imageWidth - 0.5) * 2
  const centerY = -(marker.center.y / imageHeight - 0.5) * 2

  // Estimate scale based on average edge length
  const edgeLens = [
    imagePoints[0].distanceTo(imagePoints[1]),
    imagePoints[1].distanceTo(imagePoints[2]),
    imagePoints[2].distanceTo(imagePoints[3]),
    imagePoints[3].distanceTo(imagePoints[0]),
  ]
  const avgEdge = edgeLens.reduce((a, b) => a + b, 0) / edgeLens.length
  const scale = Math.max(0.5, Math.min(2, avgEdge * 2))

  // Confidence based on how square the marker is
  const aspectRatio = edgeLens[0] / edgeLens[1]
  const confidence = Math.max(0, 1 - Math.abs(aspectRatio - 1) * 2)

  return {
    position: [centerX * 20, centerY * 20, 0],
    rotation: [rotation.x, rotation.y, rotation.z],
  }
}