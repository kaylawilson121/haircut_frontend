/**
 * Extend the Window interface to include OpenCV's cv and Module globals.
 */
interface OpenCVModule {
  preRun: Array<() => void>;
  postRun: Array<() => void>;
  printErr: (text: string) => void;
  canvas?: HTMLCanvasElement | null;
  setStatus: (text: string) => void;
  totalDependencies: number;
  monitorRunDependencies: (left: number) => void;
  // Monitor run dependencies is overwritten within its own implementation
  // Additional properties can be added if necessary
}

interface Window {
  cv: any;
  Module: OpenCVModule;
  // Keep other properties here if needed
}
