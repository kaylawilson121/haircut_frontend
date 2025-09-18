import React, { useRef, useEffect, useState } from 'react'
import ThreeScene, { PoseMap } from '@/components/ThreeD/ThreeScene'
import ThreeWorld from '@/components/ThreeD/ThreeWorld';
import PhotoUpload from '@/components/ui/PhotoUpload';
import ArucoDetector from '@/components/Detection/ArucoDetector'
import { Pose } from '@/utils/MarkerDetectionService'
import { CameraPreview } from '@capacitor-community/camera-preview';

const Index = () => {
  const [poses, setPoses] = useState<PoseMap | null>(null);
  const [baldModelUrl, setBaldModelUrl] = useState<string | null>(null);
  const [wholeModelUrl, setWholeModelUrl] = useState<string | null>(null);
  const [showThreeScene, setShowThreeScene] = useState(true);
  const [buttonText, setButtonText] = useState('Switch to 3D World');
  const [headText, setHeadText] = useState('3D Marker Tracking with Arucos');

  // CameraPreview should be controlled by the ArucoDetector component itself.
  // Removing page-level camera control avoids conflicts on emulators (LD Player)
  // where multiple start/stop calls can leave the camera locked.

  const handleButtonClick = () => {
    const next = !showThreeScene;
    setShowThreeScene(next);
    setButtonText(next ? 'Switch to 3D World' : 'Back to 3D Scene');
    setHeadText(next ? '3D Marker Tracking with Arucos' : '3D Builder with Images');
  };
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 px-2 py-6">
      <div className="w-full max-w-screen-sm">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-6 text-center drop-shadow">
          {headText}
        </h1>
        <div className="flex flex-col gap-6">
          {showThreeScene ? (
            <div className="relative w-full rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white">
              <div
                style={{ height: 320, background: '#000' }}
                className="mb-2 rounded-lg"
              >
                <ArucoDetector
                  onPoseUpdate={(detectedPose: Pose, markerId: number) => {
                    setPoses(prevPoses => ({
                      ...prevPoses,
                      [markerId]: detectedPose
                    }));
                  }}
                />
              </div>
            </div>
          ) : null}

          <button
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition text-lg"
            onClick={handleButtonClick}
          >
            {buttonText}
          </button>

          {showThreeScene ? (
            <ThreeScene poses={poses} />
          ) : (
            <>
              <PhotoUpload
                onPhotoUpload={() => {}}
                onBaldModelReceived={setBaldModelUrl}
                onWholeModelReceived={setWholeModelUrl}
              />
              <ThreeWorld baldModelUrl={baldModelUrl} wholeModelUrl={wholeModelUrl} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default Index;