import React, { useEffect, useRef, useState } from 'react';
import { FaCamera, FaUpload, FaCogs, FaCheckCircle, FaTimes, FaExpand } from "react-icons/fa";
import { CameraPreview, CameraPreviewPictureOptions } from '@capacitor-community/camera-preview';

const LABELS = [
  { key: 'front', label: 'Front' },
  { key: 'left', label: 'Left Side' },
  { key: 'right', label: 'Right Side' },
];

const PhotoUpload = ({
  onPhotoUpload,
  onBaldModelReceived,
  onWholeModelReceived,
}) => {
  const fileInputRefs = {
    front: useRef(null),
    left: useRef(null),
    right: useRef(null)
  };

  const [photos, setPhotos] = useState({
    front: { preview: null, processing: false },
    left: { preview: null, processing: false },
    right: { preview: null, processing: false }
  });

  const [selectPhotos, setSelectPhotos] = useState({
    front: { preview: null},
    left: { preview: null},
    right: { preview: null}
  });

  const [candidates, setCandidates] = useState({
    front: [],
    left: [],
    right: [],
  });
  const [selectedCandidate, setSelectedCandidate] = useState({
    front: null,
    left: null,
    right: null,
  });
  
  const [capturingSlot, setCapturingSlot] = useState(null);
  const fileInputRef = useRef(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<boolean[]>([]); // NEW: track per-image processing
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [imageProcessing, setImageProcessing] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  
  const [frontIndex, setFrontIndex] = useState<number | null>(null);
  const [showFrontAlert, setShowFrontAlert] = useState(false);

  const [baldProgress, setBaldProgress] = useState(0);
  const [wholeProgress, setWholeProgress] = useState(0);
  const [allProgress, setAllProgress] = useState(0);

  // Order and helper to enable slots one-by-one
  const ORDER = ['front', 'left', 'right'];
  const isSlotEnabled = (key: string) => {
    const idx = ORDER.indexOf(key);
    if (idx <= 0) return true; // front always enabled
    const prev = ORDER[idx - 1];
    return !!selectPhotos[prev]?.preview; // enabled only if previous slot's bald image exists
  };

  const startCamera = async (slot?) => {
    // Prevent starting camera for next slots until previous processed
    if (slot && !isSlotEnabled(slot)) {
      // small UX hint, you can adjust to a nicer toast/modal
      alert(`Please complete the ${ORDER[ORDER.indexOf(slot) - 1]} slot first.`);
      return;
    }

    setCapturing(true);
    if(slot === 'front' || slot === 'left' || slot === 'right') {
      setCapturingSlot(slot);
    }
    
    await CameraPreview.start({
      parent: 'camera-preview', // The id of the div where preview will be shown
      position: 'rear',
      toBack: false,
      width: 320,
      height: 320,
    });
  };
  
  useEffect(() => {
    if (capturing) {
      CameraPreview.start({
        parent: 'camera-preview',
        position: 'rear',
        toBack: false,
        width: 320,
        height: 320,
      });
    } else {
      // CameraPreview.stop();
      // alert("stop upload1")
    }
  }, [capturing]);

  useEffect(() => {
    setAllProgress(Math.floor(baldProgress / 2 + wholeProgress / 2))
  }, [baldProgress, wholeProgress])

  const capturePhoto = async () => {
    const result = await CameraPreview.capture({
      quality: 90
    } as CameraPreviewPictureOptions);

    const dataUrl = `data:image/jpeg;base64,${result.value}`;
    await CameraPreview.stop();
    alert("stop upload2")
    setCapturing(false);

    if (capturingSlot) {
      setPhotos(prev => ({
        ...prev,
        [capturingSlot]: { preview: dataUrl, processing: true }
      }));
      const processed = await uploadAndReplace(dataUrl);
      setPhotos(prev => ({
        ...prev,
        [capturingSlot]: { preview: processed, processing: true }
      }));
      await processImage(capturingSlot, processed);
      setCapturingSlot(null);
    } else {
      setPreviews(prev => [...prev, dataUrl]);
      setProcessingStatus(prev => [...prev, true]);
      const idx = previews.length;
      const result_new = await uploadAndReplace(dataUrl);
      setPreviews(prev => {
        const updated = [...prev];
        updated[idx] = result_new;
        return updated;
      });
      setProcessingStatus(prev => {
        const updated = [...prev];
        updated[idx] = false;
        return updated;
      });
      setPreviews(prev => [
        ...prev.slice(0, prev.length - 1),
        result_new
      ]);
      onPhotoUpload([...previews, result_new]);
    }
  };

  const handleSinglePhoto = async (event, key) => {
    if (!isSlotEnabled(key)) {
      alert(`Please complete the previous image before uploading ${key}.`);
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setPhotos(prev => ({
        ...prev,
        [key]: { preview: dataUrl, processing: true }
      }));
      const processed = await uploadAndReplace(dataUrl);
      setPhotos(prev => ({
        ...prev,
        [key]: { preview: processed, processing: true }
      }));
      // processImage will set selectPhotos[slot].preview and set processing false
      await processImage(key, processed);

      // Notify parent with the updated single-slot result (optional)
      if (onPhotoUpload) {
        onPhotoUpload({ ...photos, [key]: { preview: processed, processing: false } });
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (key, idx = null) => {
    setPhotos(prev => ({ ...prev, [key]: { preview: null, processing: false } }));
    setSelectPhotos(prev => ({ ...prev, [key]: { preview: null} }));
  };

  // useEffect(() => {
  //   processFrontImage(slot);
  // }, [frontIndex])

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  const uploadAndReplace = async (latestImage) => {
    try {
      // Send the latest image to the backend
      const res = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/process-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: latestImage }),
      });
      const blob = await res.blob();

      const processedImageBase64 = await blobToBase64(blob);
      return processedImageBase64;
    } catch (e) {
      console.error('Image processing failed', e);
    }
  };

  const handleRemoveImage = (idx: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== idx));
    // Optionally, notify parent:
    onPhotoUpload(previews.filter((_, i) => i !== idx));
  };


  const processImage = async (slot, imageBase64) => {
    // 1. Segment the image and get points
    const res = await fetch('https://662q5qidxdaxfz-8002.proxy.runpod.net/segment-image/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });
    const data = await res.json();
    const bald_image = data.image;
    const img = await uploadAndReplace(bald_image);
    
    setSelectPhotos(prev => ({
      ...prev,
      [slot]: { ...prev[slot], preview: img }
    }));

    setPhotos(prev => ({
      ...prev,
      [slot]: { ...prev[slot], processing: false }
    }));
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const readers = files.map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(async results => {
      // Add all new images to previews and set their processing status to true
      setPreviews(prev => [...prev, ...results]);
      setProcessingStatus(prev => [...prev, ...results.map(() => true)]);

      // Process each image and update status
      for (let i = 0; i < results.length; i++) {
        const idx = previews.length + i;
        const result_new = await uploadAndReplace(results[i]);
        setPreviews(prev => {
          const updated = [...prev];
          updated[idx] = result_new;
          return updated;
        });
        setProcessingStatus(prev => {
          const updated = [...prev];
          updated[idx] = false;
          return updated;
        });
        onPhotoUpload([...previews, ...results.slice(0, i + 1).map((_, j) => j === i ? result_new : results[j])]);
      }
    });
  };

  const handleUploadToBackendWhole = async () => {
    setLoading(true);
    setWholeProgress(0);
    try {
      // 1. Upload images and get task_id/model_url
      const uploadRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/upload/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: [
            photos.front.preview,
            photos.left.preview,
            photos.right.preview,
            ...previews,
          ],
          should_texture : true,
        }),
      });
      const uploadData = await uploadRes.json();

      // If uploadData is a string, treat as task_id; if object, get task_id/model_url
      let task_id = uploadData.task_id || uploadData.id || uploadData;
      let model_url = uploadData.model_url;

      // 2. Poll progress if not done
      let done = false;
      let pollCount = 0;
      while (!done && pollCount < 20 * previews.length + 50 ) { 
        await new Promise(res => setTimeout(res, 12000));
        const progressRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/progress/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id }),
        });
        const progressData = await progressRes.json();

        // If progressData is a number, update progress
        if (typeof progressData === 'number') {
          setWholeProgress(progressData);
          if (progressData >= 100) done = true;
        } else if (progressData.status === "SUCCEEDED") {
          setWholeProgress(100);
          model_url = progressData.model_url || progressData.result?.model_url;
          done = true;
        } else if (progressData.progress) {
          setWholeProgress(progressData.progress);
        }
        pollCount++;
      }

      // 3. Download model when ready
      if (model_url) {
        const downloadRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/download-model/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_url }),
        });
        const blob = await downloadRes.blob();
        const glbUrl = URL.createObjectURL(blob) + '#file.glb';
        onWholeModelReceived(glbUrl);
      } else {
        alert("Model URL not found!");
      }
    } catch (e) {
      console.error(e);
      alert('Upload or model build failed');
    }
    setLoading(false);
    return;
    // setWholeProgress(0);
  };
  
  const handleUploadToBackendBald = async () => {
    setLoading(true);
    setBaldProgress(0);
    try {
      // 1. Upload images and get task_id/model_url
      const uploadRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/upload/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: [
            selectPhotos.front.preview,
            selectPhotos.left.preview,
            selectPhotos.right.preview,
          ],
          should_texture : true,
        }),
      });
      const uploadData = await uploadRes.json();

      // If uploadData is a string, treat as task_id; if object, get task_id/model_url
      let task_id = uploadData.task_id || uploadData.id || uploadData;
      let model_url = uploadData.model_url;

      // 2. Poll progress if not done
      let done = false;
      let pollCount = 0;
      while (!done && pollCount < 20 * previews.length + 50 ) { 
        await new Promise(res => setTimeout(res, 6000));
        const progressRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/progress/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id }),
        });
        const progressData = await progressRes.json();

        // If progressData is a number, update progress
        if (typeof progressData === 'number') {
          setBaldProgress(progressData);
          if (progressData >= 100) done = true;
        } else if (progressData.status === "SUCCEEDED") {
          setBaldProgress(100);
          model_url = progressData.model_url || progressData.result?.model_url;
          done = true;
        } else if (progressData.progress) {
          setBaldProgress(progressData.progress);
        }
        pollCount++;
      }

      // 3. Download model when ready
      if (model_url) {
        const downloadRes = await fetch('https://662q5qidxdaxfz-8000.proxy.runpod.net/download-model/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_url }),
        });
        const blob = await downloadRes.blob();
        const glbUrl = URL.createObjectURL(blob) + '#file.glb';
        onBaldModelReceived(glbUrl);
      } else {
        alert("Model URL not found!");
      }
    } catch (e) {
      console.error(e);
      alert('Upload or model build failed');
    }
    setLoading(false);
    return;
    // setBaldProgress(0);
  };
  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto px-2 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 w-full">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center">
            <div className="mb-2 font-semibold">{label}</div>
            {photos[key].preview ? (
              <div className="relative">
                <img 
                  src={photos[key].preview} 
                  alt={label}
                  className={`w-32 h-32 object-contain rounded shadow transition-opacity duration-300 cursor-pointer ${
                    photos[key].processing ? 'opacity-40' : ''
                  }`}
                  onClick={() => setModalImage(photos[key].preview)}
                />
                <button
                  className="absolute top-1 right-1 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-1 shadow"
                  onClick={() => removePhoto(key)}
                  type="button"
                >
                  <FaTimes />
                </button>
                {photos[key].processing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <FaCogs className="w-10 h-10 text-white animate-spin mb-2" />
                    <span className="text-white font-semibold text-sm">Processing...</span>
                  </div>
                )}
                {selectPhotos[key].preview && (
                  <div className="flex gap-2 mt-2">
                    <img
                      src={selectPhotos[key].preview}
                      // alt={`Filled ${idx + 1}`}
                      className={`w-32 h-32 object-contain rounded border-2 cursor-pointer transition ${
                        'border-blue-500 ring-2 ring-blue-400'
                        // : 'border-gray-300'
                      }`}
                      onClick={() => setModalImage(selectPhotos[key].preview)}
                      // onClick={() => setSelectedFilled(prev => ({ ...prev, [key]: idx }))}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  className="w-32 h-32 flex items-center justify-center bg-gray-200 rounded shadow mb-1"
                  onClick={() => {
                    if (!isSlotEnabled(key)) {
                      alert(`Please complete the ${ORDER[Math.max(0, ORDER.indexOf(key)-1)]} slot first.`);
                      return;
                    }
                    fileInputRefs[key].current.click();
                  }}
                  type="button"
                  disabled={!isSlotEnabled(key)}
                >
                  <FaUpload className={`text-2xl text-gray-500 ${!isSlotEnabled(key) ? 'opacity-40' : ''}`} />
                </button>
                <button
                  className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full shadow"
                  onClick={() => startCamera(key)}
                  type="button"
                  title={`Take ${label} Photo`}
                  disabled={!isSlotEnabled(key)}
                >
                  <FaCamera className={`text-xl ${!isSlotEnabled(key) ? 'opacity-40' : ''}`} />
                </button>
                {!isSlotEnabled(key) && (
                  <div className="text-xs text-gray-400 mt-2">Complete previous slot first</div>
                )}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRefs[key]}
              className="hidden"
              onChange={e => handleSinglePhoto(e, key)}
            />
          </div>
        ))}
      </div>
      {wholeProgress > 0 && wholeProgress < 100 && (
        <div className="mb-2">
          <div className="text-blue-700 font-semibold mb-1">Whole Model Progress: {wholeProgress}%</div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${wholeProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      {baldProgress > 0 && baldProgress < 100 && (
        <div className="mb-2">
          <div className="text-pink-700 font-semibold mb-1">Bald Model Progress: {baldProgress}%</div>
          <div className="w-full bg-gray-300 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${baldProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      {!capturing ? (
        <>
          <div className="flex flex-wrap gap-3 w-full justify-center mb-4">
            <button
              className={`flex-1 min-w-[120px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition flex items-center justify-center gap-2`}
              onClick={startCamera}
            >
              <FaCamera className="text-xl" />
              Take Photo
            </button>
            <button
              className={`flex-1 min-w-[120px] px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition flex items-center justify-center gap-2`}
              onClick={() => fileInputRef.current.click()}
            >
              <FaUpload className="text-xl" />
              Upload Photo
            </button>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          {previews.length > 0 && (
            <div className="w-full mb-4">
              <div className="max-h-64 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full mb-4">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden shadow bg-gray-100">
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className={`w-full h-full object-contain transition-opacity duration-300 cursor-pointer ${
                          processingStatus[idx] ? 'opacity-40' : ''
                        }`}
                        onClick={() => setModalImage(src)}
                      />
                      {/* Remove button */}
                      <button
                        type="button"
                        className="absolute top-2 right-2 z-30 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-1 shadow transition"
                        onClick={() => {
                          handleRemoveImage(idx);
                        }}
                        aria-label="Remove image"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                      {processingStatus[idx] && (
                        <div className="absolute inset-0 z-20 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                          <FaCogs className="w-10 h-10 text-white animate-spin mb-2" />
                          <span className="text-white font-semibold text-sm">Processing...</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          { selectPhotos.left.preview && selectPhotos.right.preview && (
            <div className="text-center text-sm text-gray-500 mb-4">
              <button
                className={`w-full py-3 px-10 bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow flex items-center justify-center gap-2 text-lg font-semibold transition`}
                  onClick={() => {
                    handleUploadToBackendWhole();
                    handleUploadToBackendBald();
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaCogs className="w-6 h-6 animate-spin" />
                    <span>
                      {allProgress > 0 && allProgress < 100 ? (
                        <span>
                          <span className="font-bold">{allProgress}%</span> Building...
                        </span>
                      ) : (
                        'Building...'
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="w-6 h-6" />
                    Build 3D Model
                  </>
                )}
              </button>
            </div>
          )}
          {loading && (
            <div className="w-full mt-4">
              <div className="w-full bg-gray-300 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${allProgress}%` }}
                ></div>
              </div>
              <div className="text-center mt-2 text-purple-700 font-semibold animate-pulse text-base">
                {allProgress < 100 ? `Processing: ${allProgress}%` : "Almost done..."}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full">
          {capturing && (
            <div id="camera-preview" style={{ width: 320, height: 320 }} className="mb-4 rounded-lg shadow"></div>
          )} 
          <div className="flex gap-3 w-full">
            <button
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow text-lg font-semibold transition flex items-center justify-center gap-2"
              onClick={capturePhoto}
            >
              <FaCamera className="text-xl" />
              Capture
            </button>
            <button
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow text-lg font-semibold transition flex items-center justify-center gap-2"
              onClick={() => {
                setCapturing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-full max-h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={modalImage}
              alt="Enlarged preview"
              className="rounded-lg shadow-2xl max-h-[40vh] max-w-[90vw] border-4 border-white"
            />
            <button
              className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-2 shadow transition"
              onClick={() => setModalImage(null)}
              aria-label="Close"
            >
              <FaTimes className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
