
import { Marker, Pose } from './MarkerDetectionService';

export class PoseEstimator {
  private cv: any;
  private objectPoints: any = null;
  private cameraMatrix: any = null;
  private distCoeffs: any = null;
  private isInitialized = false;

  constructor(cv: any) {
    this.cv = cv;
  }

  /**
   * Initialize OpenCV matrices for pose estimation
   */
  initialize(canvasWidth: number, canvasHeight: number): boolean {
    if (!this.cv) {
      console.warn('OpenCV not available');
      return false;
    }

    try {
      // Release any existing matrices to prevent memory leaks
      this.releaseMatrices();
      
      const markerSize = 0.052; // 5.2cm
      const halfSize = markerSize / 2;

      // Create object points (3D coordinates of marker corners in marker coordinate system)
      const objectPoints = new this.cv.Mat(4, 3, this.cv.CV_32FC1);
      const f32 = objectPoints.data32F;
      f32[0] = -halfSize; f32[1] = -halfSize; f32[2] = 0;
      f32[3] = halfSize; f32[4] = -halfSize; f32[5] = 0;
      f32[6] = halfSize; f32[7] = halfSize; f32[8] = 0;
      f32[9] = -halfSize; f32[10] = halfSize; f32[11] = 0;
      this.objectPoints = objectPoints;

      // Create camera matrix with approximate values
      const cameraMatrix = new this.cv.Mat(3, 3, this.cv.CV_64FC1);
      const d64 = cameraMatrix.data64F;
      d64[0] = 800; d64[1] = 0; d64[2] = canvasWidth / 2;
      d64[3] = 0; d64[4] = 800; d64[5] = canvasHeight / 2;
      d64[6] = 0; d64[7] = 0; d64[8] = 1;
      this.cameraMatrix = cameraMatrix;

      // Create distortion coefficients (assume no distortion for simplicity)
      const distCoeffs = new this.cv.Mat(5, 1, this.cv.CV_64FC1);
      const dist64 = distCoeffs.data64F;
      dist64[0] = 0; dist64[1] = 0; dist64[2] = 0; dist64[3] = 0; dist64[4] = 0;
      this.distCoeffs = distCoeffs;

      this.isInitialized = true;
      // //console.log('PoseEstimator initialized successfully');
      return true;
    } catch (err) {
      console.error('Error initializing PoseEstimator:', err);
      this.releaseMatrices();
      return false;
    }
  }

  /**
   * Calculate 3D pose from marker corners
   */
  calculatePose(marker: Marker): Pose | null {
    if (!this.isInitialized || !this.cv || !marker) {
      return null;
    }

    try {
      // Create matrix for image points (2D coordinates in the image)
      const imagePoints = new this.cv.Mat(4, 2, this.cv.CV_32FC1);
      for (let i = 0; i < 4; i++) {
        imagePoints.data32F[i * 2] = marker.corners[i].x;
        imagePoints.data32F[i * 2 + 1] = marker.corners[i].y;
      }

      // Rotation and translation vectors
      const rvec = new this.cv.Mat();
      const tvec = new this.cv.Mat();

      // Calculate pose using solvePnP
      this.cv.solvePnP(
        this.objectPoints,
        imagePoints,
        this.cameraMatrix,
        this.distCoeffs,
        rvec,
        tvec
      );

      // Convert rotation vector to rotation matrix
      const rotationMatrix = new this.cv.Mat();
      this.cv.Rodrigues(rvec, rotationMatrix);

      // Extract position and rotation
      const position: [number, number, number] = [
        tvec.data64F[0] * 100, // Convert to centimeters
        tvec.data64F[1] * 100,
        tvec.data64F[2] * 100,
      ];

      // Calculate Euler angles from rotation matrix
      const rotation: [number, number, number] = [
        (Math.atan2(rotationMatrix.data64F[7], rotationMatrix.data64F[8]) * 180) / Math.PI,
        (Math.atan2(-rotationMatrix.data64F[6], Math.sqrt(rotationMatrix.data64F[7] ** 2 + rotationMatrix.data64F[8] ** 2)) * 180) / Math.PI,
        (Math.atan2(rotationMatrix.data64F[3], rotationMatrix.data64F[0]) * 180) / Math.PI,
      ];

      // Clean up temporary matrices to avoid memory leaks
      imagePoints.delete();
      rvec.delete();
      tvec.delete();
      rotationMatrix.delete();

      return { position, rotation };
    } catch (err) {
      console.error('Error calculating pose:', err);
      return null;
    }
  }

  /**
   * Release all OpenCV matrices to prevent memory leaks
   */
  releaseMatrices(): void {
    try {
      if (this.objectPoints) {
        this.objectPoints.delete();
        this.objectPoints = null;
      }
      
      if (this.cameraMatrix) {
        this.cameraMatrix.delete();
        this.cameraMatrix = null;
      }
      
      if (this.distCoeffs) {
        this.distCoeffs.delete();
        this.distCoeffs = null;
      }
      
      this.isInitialized = false;
    } catch (err) {
      console.warn('Error releasing matrices:', err);
    }
  }
}
