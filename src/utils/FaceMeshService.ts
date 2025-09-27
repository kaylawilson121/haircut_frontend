import { FaceMesh } from "@mediapipe/face_mesh";

class FaceMeshService {
  private faceMesh: FaceMesh | null = null;
  private onLandmarksUpdate: ((landmarks: any) => void) | null = null;

  async initialize(callback: (landmarks: any) => void) {
    if (this.faceMesh) return;

    this.onLandmarksUpdate = callback;
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    await this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks?.length > 0) {
        this.onLandmarksUpdate?.(results.multiFaceLandmarks[0]);
      }
    });
  }

  async processImage(image: HTMLImageElement) {
    if (!this.faceMesh) return;
    await this.faceMesh.send({ image });
  }

  dispose() {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
  }
}

export const faceMeshService = new FaceMeshService();
