
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

/**
 * A hook that calculates the closest point on a head model's surface
 * given x and y coordinates.
 */
export const useHeadSurfacePosition = () => {
  // Reference to the head model's mesh
  const headMeshRef = useRef<THREE.Object3D | null>(null);
  // Raycaster for finding intersections with the head model
  const raycaster = useRef(new THREE.Raycaster());
  // Three.js scene access
  const { scene } = useThree();

  // Set up the reference to the head model
  useEffect(() => {
    // Find the head model in the scene by name
    const headModelObject = scene.getObjectByName("HeadModel");
    if (headModelObject) {
      headMeshRef.current = headModelObject;
    }
  }, [scene]);

  /**
   * Calculate the position where the trimmer should be placed when it touches the head
   * @param trimmerPosition The current position of the trimmer [x, y, z]
   * @param headPosition The current position of the head [x, y, z]
   * @returns The adjusted position with corrected z-value or null if no intersection found
   */
  const calculateSurfacePosition = (
    trimmerPosition: [number, number, number],
    headPosition: [number, number, number]
  ): [number, number, number] | null => {
    if (!headMeshRef.current) return null;

    // Create a ray starting from a position behind the head pointing toward the trimmer
    // This ensures we catch the front surface of the head
    const rayDirection = new THREE.Vector3(
      trimmerPosition[0] - headPosition[0],
      trimmerPosition[1] - headPosition[1],
      trimmerPosition[2] - headPosition[2]
    ).normalize();

    // Ray origin: start from behind the head model
    const rayOrigin = new THREE.Vector3(
      headPosition[0] - rayDirection.x * 20, // Start far behind
      headPosition[1] - rayDirection.y * 20,
      headPosition[2] - rayDirection.z * 20
    );

    raycaster.current.set(rayOrigin, rayDirection);

    // Collect all meshes in the head model hierarchy
    const headMeshes: THREE.Mesh[] = [];
    headMeshRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        headMeshes.push(child as THREE.Mesh);
      }
    });

    if (headMeshes.length === 0) return null;

    // Find intersections with the head model
    const intersects = raycaster.current.intersectObjects(headMeshes);

    if (intersects.length > 0) {
      // Get the first (closest) intersection
      const intersection = intersects[0];
      return [
        intersection.point.x,
        intersection.point.y,
        intersection.point.z
      ];
    }

    // Fallback if no intersection found
    return null;
  };

  return { calculateSurfacePosition };
};
