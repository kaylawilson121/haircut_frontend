class FaceMeshService {
  private faceMesh: any = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Dynamically import FaceMesh
      const { FaceMesh } = await import('@mediapipe/face_mesh');
      
      // Make sure FaceMesh is available
      if (!FaceMesh) {
        throw new Error('FaceMesh failed to load');
      }

      this.faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        }
      });

      await this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.initialized = true;
    } catch (error) {
      console.error('FaceMesh initialization error:', error);
      throw error;
    }
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
