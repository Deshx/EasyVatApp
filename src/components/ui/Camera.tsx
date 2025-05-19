import { useRef, useState, useEffect } from 'react';

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export default function Camera({ onCapture, onClose }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    
    async function startCamera() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setIsCameraActive(true);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Unable to access camera. Please check permissions and try again.');
      }
    }

    startCamera();

    // Cleanup: stop the camera when component unmounts
    return () => {
      stopCameraStream(mediaStream);
    };
  }, []);

  // Helper function to stop camera stream
  const stopCameraStream = (mediaStream: MediaStream | null) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.readyState);
        track.stop();
      });
    }
    
    // Also clear the video srcObject
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Draw the image first
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg');
        
        // Immediately stop all camera tracks
        console.log('Stopping camera stream after capture');
        stopCameraStream(stream);
        setStream(null);
        
        // Then pass the captured image
        onCapture(imageSrc);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Stop camera stream since we're using an uploaded file
    stopCameraStream(stream);
    setStream(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      onCapture(imageSrc);
    };
    reader.onerror = () => {
      setError('Failed to read the selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClose = () => {
    // Ensure camera is fully stopped before closing
    console.log('Closing camera');
    stopCameraStream(stream);
    setStream(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 h-screen">
      <div className="bg-white w-full h-full max-w-full max-h-full flex flex-col">
        <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
          <h2 className="text-xl font-semibold">Capture Bill</h2>
          <button 
            onClick={handleClose}
            className="text-white text-2xl"
          >
            &times;
          </button>
        </div>
        
        {error ? (
          <div className="bg-red-50 border border-red-400 text-red-700 p-4 m-4 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            <div className="flex-grow relative bg-black overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center p-6">
                    <p>Camera is off. Please upload an image or close and reopen.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-gray-800 relative">
              <div className="flex justify-center items-center">
                {isCameraActive && (
                  <div className="absolute left-4">
                    <button
                      onClick={handleBrowseClick}
                      className="bg-transparent hover:bg-gray-700 text-white p-2 rounded-full focus:outline-none"
                      aria-label="Upload Image"
                    >
                      {/* Paperclip / Attachment Icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {isCameraActive && (
                  <button
                    onClick={handleCapture}
                    className="bg-white text-gray-800 p-4 rounded-full hover:bg-gray-200 focus:outline-none flex items-center justify-center"
                    aria-label="Capture"
                  >
                    {/* Camera Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                
                {!isCameraActive && (
                  <button
                    onClick={handleBrowseClick}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 focus:outline-none flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Upload Image</span>
                  </button>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>
    </div>
  );
} 