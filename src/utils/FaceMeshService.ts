import { FaceMesh } from "@mediapipe/face_mesh";

class FaceMeshService {
  private faceMesh: FaceMesh | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    await this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.initialized = true;
  }

  setResultsHandler(callback: (results: any) => void) {
    if (!this.faceMesh) return;
    this.faceMesh.onResults(callback);
  }

  async processImage(image: HTMLImageElement) {
    if (!this.faceMesh || !this.initialized) return;
    await this.faceMesh.send({ image });
  }

  dispose() {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
      this.initialized = false;
    }
  }
}

export const faceMeshService = new FaceMeshService();
export const faceMeshService = new FaceMeshService();
