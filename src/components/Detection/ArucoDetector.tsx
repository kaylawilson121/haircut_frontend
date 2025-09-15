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
  const [markers, setMarkers] = useState<ArUcoMarker[]>([])
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  // Service refs
  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const poseEstimatorRef = useRef<PoseEstimator | null>(null);
  const cameraReadyRef = useRef<boolean>(false);
  // Interval ref for frame processing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  
  useEffect( ()=>{
    const initializeCamera = async () => {
      await CameraPreview.stop();
      await CameraPreview.start({
        parent: "camera-preview", // The id of the div where the preview will be shown
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
    }
    initializeCamera()
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    try {
      // wsRef.current = new WebSocket("wss://api.fadeaway.app/ws")
      wsRef.current = new WebSocket("ws://localhost:8001/ws")

      wsRef.current.onopen = () => {
        console.log("WebSocket connected for 3D tracking")
        setError("")
      }
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "detection_result") {
            const detectedMarkers = data.markers || []
            // console.log(detectedMarkers)
            setMarkers(detectedMarkers)
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setError('Could not get canvas context');
              return;
            }

            // Set canvas dimensions
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            // Calculate 3D pose

            // canvasRendererRef.current.drawMarkerCorners(ctx, detectedMarkers);
            // canvasRendererRef.current.drawMarkerIds(ctx, detectedMarkers);

            // Process each detected marker
            
            if (detectedMarkers.length > 0) {
              detectedMarkers.forEach(marker => {
                // console.log(marker)
                const pose = {
                  rotation: marker.rotation,
                  position: marker.translation,
                } as Pose
                if (pose && onPoseUpdate) {
                  onPoseUpdate(pose, marker.id);
                }
              });
            }
            // const pose = calculateMarkerPose(trackedMarker, processingWidth, processingWidth * 0.75)
            // setMarkerPose(pose)
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

        setTimeout(() => {
          initializeWebSocket()
        }, 2000)
      }
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        setError("WebSocket connection failed. Make sure the server is running." + 
          (typeof error === "string"
            ? error
            : JSON.stringify(error))
        )
      }
    } catch (err) {
      console.error("WebSocket initialization error:", err)
      setError("Failed to initialize WebSocket connection" + 
        (typeof err === "string"
          ? err
          : JSON.stringify(err))
      )
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
    // Only start processing if OpenCV is loaded and canvas is available
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not get canvas context');
      return;
    }

    // Set canvas dimensions
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    if (poseEstimatorRef.current) {
      poseEstimatorRef.current.initialize(canvas.width, canvas.height);
    }

    // Frame processing function
    const processCameraFrame = async () => {
      if (!cameraReadyRef.current){
        console.warn("Camera is not ready yet, skipping frame processing");
        return;
      }

      try {
        const result = await CameraPreview.captureSample({ quality: 0.4 * 100 })
        // result.value is base64 string (no data:image/jpeg;base64, prefix)
        const frameData = "data:image/jpeg;base64," + result.value
        const flippedFrame = await flipBase64Image(frameData)
        wsRef.current.send(
          JSON.stringify({
            type: "frame",
            frame: flippedFrame,
            timestamp: Date.now(),
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          }),
        )
        
        const img = new window.Image();
        img.src = `data:image/jpeg;base64,${result.value}`;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Detection logic
          if (canvasRendererRef.current) {
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (err) {
              console.error('Error in frame processing:', err);
            }
          }
        };
      } catch (err) {
        setError('Camera capture failed' + err);
      }
    };

    // Start interval for ~20fps (every 50ms)
    if( !intervalRef.current ) {
      setTimeout(() => {
        console.log("Starting frame processing interval")
        intervalRef.current = setInterval(processCameraFrame, 50)
      }, 2000)
    }

  }, [onPoseUpdate]);

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