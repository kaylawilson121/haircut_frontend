import React, { useEffect, useRef, useState } from 'react';
import { calculateMarkerPose, Pose } from '../../utils/MarkerDetectionService';
import { CanvasRenderer } from '../../utils/CanvasRenderer';
import { PoseEstimator } from '../../utils/PoseEstimator';
import { ModelsConfig } from '@/modelsConfig';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { Canvas } from '@react-three/fiber';

interface ArucoDetectorProps {
  onPoseUpdate?: (pose: Pose, markerId: number) => void;
}

interface ArUcoMarker {
  id: number
  corners: number[][]
  center: { x: number; y: number }
}

interface MarkerPose {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  confidence: number
}

let CANVAS_WIDTH = 320;
let CANVAS_HEIGHT = 240;

const ArucoDetector: React.FC<ArucoDetectorProps> = ({ onPoseUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null)
  const [isSocketOpen, setIsSocketOpen] = useState(false); // NEW: socket open state
  const [markers, setMarkers] = useState<ArUcoMarker[]>([])
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Service refs
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const poseEstimatorRef = useRef<PoseEstimator | null>(null);
  const cameraReadyRef = useRef<boolean>(false);
  // Interval ref for frame processing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startingCameraRef = useRef<boolean>(false); // NEW: avoid double starts

  
  useEffect( ()=> {
    const initializeCamera = async () => {
      if (startingCameraRef.current) return; // already starting
      startingCameraRef.current = true;
      try {
        await CameraPreview.stop();
      } catch (stopErr) {
        // ignore stop errors
        console.warn('CameraPreview.stop() warning:', stopErr);
      }

      try {
        await CameraPreview.start({
          parent: "camera-preview",
          position: "rear",
          x: 60,
          y: 700,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          toBack: false,
          className: "",
        });
        initializeWebSocket();
        setIsCameraReady(true);
        cameraReadyRef.current = true;
      } catch (startErr: any) {
        // ignore the "camera_already_started" error but surface others
        const msg = startErr?.message ?? String(startErr);
        if (msg && msg.includes('camera_already_started')) {
          console.warn('Camera already started, continuing.');
          initializeWebSocket();
          setIsCameraReady(true);
          cameraReadyRef.current = true;
        } else {
          console.error('CameraPreview.start() failed:', startErr);
          setError('Camera start failed: ' + msg);
        }
      } finally {
        startingCameraRef.current = false;
      }
    };
    initializeCamera();

    // cleanup native preview on unmount
    return () => {
      try {
        CameraPreview.stop();
      } catch (err) {
        /* ignore */
      }
    };
  }, []);


  // Initialize WebSocket connection (modified to update isSocketOpen)
  const initializeWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    try {
      wsRef.current = new WebSocket("wss://api.fadeaway.app/ws")
      // wsRef.current = new WebSocket("ws://localhost:8001/ws")

      wsRef.current.onopen = () => {
        console.log("WebSocket connected for 3D tracking")
        setError("")
        setIsSocketOpen(true); // NEW
      }
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "detection_result") {
            const detectedMarkers = data.markers || []
            setMarkers(detectedMarkers)

            const canvas = canvasRef.current;
            if (!canvas) {
              console.warn('Canvas missing in ws.onmessage');
              return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setError('Could not get canvas context');
              return;
            }

            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;

            if (detectedMarkers.length > 0) {
              detectedMarkers.forEach(marker => {
                const pose = {
                  rotation: marker.rotation,
                  position: marker.translation,
                } as Pose
                if (pose && onPoseUpdate) {
                  onPoseUpdate(pose, marker.id);
                }
              });
            }
          } else if (data.type === "error") {
            console.error("Server error:", data.message)
            setError(data.message)
          }
        } catch (err) {
          console.error("WebSocket message parsing error:", err)
        }
      }
      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected")
        setIsSocketOpen(false); // NEW
        setTimeout(() => initializeWebSocket(), 2000)
      }

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        setIsSocketOpen(false); // NEW
        setError("WebSocket connection failed. Make sure the server is running." +
          (typeof error === "string" ? error : JSON.stringify(error)))
      }
    } catch (err) {
      console.error("WebSocket initialization error:", err)
      setError("Failed to initialize WebSocket connection" +
        (typeof err === "string" ? err : JSON.stringify(err)))
    }
  }

  useEffect(() => {
    // Initialize services
    try {
      canvasRendererRef.current = new CanvasRenderer();
    } catch (err) {
      console.error('Error initializing services:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize detection services');
    }

    // Initialize OpenCV-dependent services when OpenCV is loaded
    // if (!poseEstimatorRef.current) {
    //   poseEstimatorRef.current = new PoseEstimator(cv);
    // }

    return () => {
      // Release OpenCV resources
      if (poseEstimatorRef.current) {
        poseEstimatorRef.current.releaseMatrices();
      }
      // Clear interval
      // if (intervalRef.current) {
      //   clearInterval(intervalRef.current);
      //   intervalRef.current = null;
      // }
    };
  }, []);
    
  function flipBase64Image(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.translate(img.width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg'))
      }
      img.src = base64
    })
  }

  useEffect(() => {
    // Only start processing if canvas is available and both camera + socket are ready
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context');
      return;
    }

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    if (poseEstimatorRef.current) {
      poseEstimatorRef.current.initialize(canvas.width, canvas.height);
    }

    // Frame processing function
    const processCameraFrame = async () => {
      if (!cameraReadyRef.current) return;

      try {
        const result = await CameraPreview.captureSample({ quality: 0.4 * 100 });
        if (!result || !result.value) {
          console.warn('captureSample returned empty result, skipping frame');
          return;
        }
        const base64Value = result.value;
        const frameData = "data:image/jpeg;base64," + base64Value;
        const flippedFrame = await flipBase64Image(frameData);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "frame",
            frame: flippedFrame,
            timestamp: Date.now(),
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          }));
        } else {
          console.warn('WebSocket not open, skipping frame send');
        }

        const img = new window.Image();
        img.onload = () => {
          try {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch (drawErr) {
            console.warn('Error drawing captured image:', drawErr);
          }
        };
        img.onerror = (e) => {
          console.warn('Failed to load image from captureSample data', e);
        };
        img.src = frameData;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.error('Camera capture failed:', msg);
        setError('Camera capture failed: ' + msg);
      }
    };

    // start interval only when both camera and websocket are ready
    if (isCameraReady && isSocketOpen && !intervalRef.current) {
      timeoutRef.current = setTimeout(() => {
        console.log("Starting frame processing interval");
        intervalRef.current = setInterval(processCameraFrame, 500);
      }, 200);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onPoseUpdate, isCameraReady, isSocketOpen]); // now depends on socket open state

  if (error) {
    return (
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-red-100 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div id="camera-preview" style={{ width: "100%", height: 220, background: "#000", borderRadius: 12 }} />
      <canvas
        ref={canvasRef}
        // width={320}
        // height={320}
        className="absolute top-0"
        style={{ display:'none' }}
      />
    </div>
  );
};

export default ArucoDetector;