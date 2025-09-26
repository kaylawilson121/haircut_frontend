import * as THREE from 'three';

type Landmark = { x: number; y: number; z: number };

export function estimateHeadPoseFromLandmarks(
  points: Landmark[],
  opts?: { imageWidth?: number; imageHeight?: number }
): { position: [number, number, number]; rotation: [number, number, number] } | null {
  if (!points || points.length === 0) return null;

  // Common mediapipe face mesh indices used as heuristics
  const LEFT_EYE = 33;
  const RIGHT_EYE = 263;
  const NOSE = 1;
  const CHIN = 152;

  const get = (i: number) => points[i] ?? null;
  const leftEye = get(LEFT_EYE) ?? points[Math.floor(points.length * 0.32)];
  const rightEye = get(RIGHT_EYE) ?? points[Math.floor(points.length * 0.68)];
  const nose = get(NOSE) ?? points[Math.floor(points.length * 0.5)];
  const chin = get(CHIN) ?? points[Math.floor(points.length * 0.9)];

  if (!leftEye || !rightEye || !nose || !chin) return null;

  // Create vectors in camera/image normalized coordinates
  const le = new THREE.Vector3(leftEye.x, leftEye.y, leftEye.z);
  const re = new THREE.Vector3(rightEye.x, rightEye.y, rightEye.z);
  const ns = new THREE.Vector3(nose.x, nose.y, nose.z);
  const ch = new THREE.Vector3(chin.x, chin.y, chin.z);

  // Eye vector (left->right) (image coords: x right, y down)
  const eyeVec = new THREE.Vector3().subVectors(re, le).normalize();

  // Nose to chin (down direction)
  const noseToChin = new THREE.Vector3().subVectors(ch, ns).normalize();

  // Face normal approximated by cross(eyeVec, noseToChin)
  const normal = new THREE.Vector3().crossVectors(eyeVec, noseToChin).normalize();

  // Build a basis: x = eyeVec, y = noseToChin, z = normal
  const xAxis = eyeVec.clone();
  const yAxis = noseToChin.clone();
  const zAxis = normal.clone();

  // In image coordinates y is down; convert to a right-handed 3D basis for Three.js
  // We'll construct a rotation matrix that maps this face basis to world basis.
  const mat = new THREE.Matrix4();
  mat.makeBasis(xAxis, yAxis, zAxis);

  // Convert basis matrix to quaternion/euler
  const quat = new THREE.Quaternion().setFromRotationMatrix(mat);
  const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

  // Convert normalized image positions to scene-like coordinates (approximate)
  // Map normalized x [0..1] to scene coordinates in centimeters
  const scaleXcm = 1500; // horizontal half-range in cm
  const scaleYcm = 1000; // vertical half-range in cm

  // Estimate face size from landmarks to infer depth.
  // Use inter-eye distance and nose-to-chin as proxies for face size in the image.
  const eyeDist = le.distanceTo(re); // normalized units
  const noseChinDist = ns.distanceTo(ch);
  const diag = Math.sqrt(eyeDist * eyeDist + noseChinDist * noseChinDist);

  // Tunable mapping: when diag is small -> far, when diag is large -> near
  const minSize = 0.08; // very small face in frame (normalized)
  const maxSize = 0.48; // very close face in frame (normalized)
  const t = Math.min(1, Math.max(0, (diag - minSize) / (maxSize - minSize)));

  // Depth bounds (cm). Adjust these to match your scene/camera scale.
  const nearestCm = 25; // when face fills frame (closest)
  const farthestCm = 200; // when face is tiny (farthest)

  // Interpolate depth: larger diag => closer (smaller cm)
  const depthCm = farthestCm + (nearestCm - farthestCm) * t;

  // Small correction from mediapipe's z (which is relative and noisy). Scale down to cm.
  const zCorrectionCm = (ns.z || 0) * 100; // adjust multiplier if needed

  // Use nose as the anchor point (map normalized coords to cm around origin)
  const posX = -(0.5 - ns.x) * scaleXcm; // flip x because video is mirrored in UI
  const posY = -(ns.y - 0.5) * scaleYcm; // image y increases downward
  const posZ = (depthCm + zCorrectionCm) * 8;

  // Return pose in centimeters and rotations in degrees
  return {
    position: [posX, posY, -posZ + 10],
    rotation: [
      -(euler.x * 180) / Math.PI + 24,
      -(euler.y * 180) / Math.PI,
      (euler.z * 180) / Math.PI ,
    ],
  };
}

export default estimateHeadPoseFromLandmarks;
