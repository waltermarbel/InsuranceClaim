import React, { useState, useRef, useEffect } from 'react';
import { XIcon, SpinnerIcon, VideoCameraIcon } from './icons';

interface RoomScanViewProps {
  onClose: () => void;
  onProcessVideo: (videoBlob: Blob) => void;
}

const RoomScanView: React.FC<RoomScanViewProps> = ({ onClose, onProcessVideo }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: 'environment' // Prefer rear camera
            }, 
            audio: false 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please ensure permissions are granted in your browser settings.");
        onClose();
      }
    };
    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (stream) {
      setRecordedChunks([]);
      setVideoUrl(null);
      
      const options = { mimeType: 'video/webm; codecs=vp8' };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('webm/vp8 not supported, falling back.');
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };
      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks, { type: recorder.mimeType });
        const url = URL.createObjectURL(videoBlob);
        setVideoUrl(url);
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
      };
      recorder.start();
      setIsRecording(true);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  
  const handleRetake = () => {
      if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(null);
      setRecordedChunks([]);
      if(videoRef.current && stream) {
          videoRef.current.srcObject = stream;
      }
  }

  const handleProcess = () => {
      setIsProcessing(true);
      const videoBlob = new Blob(recordedChunks, { type: mediaRecorderRef.current?.mimeType || 'video/webm' });
      onProcessVideo(videoBlob);
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-center items-center p-4"
        onClick={onClose}
    >
      <div 
        className="bg-dark/80 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white font-heading flex items-center gap-3">
                <VideoCameraIcon className="h-6 w-6 text-primary-light"/>
                Room Scanner
            </h2>
            <button onClick={onClose} className="text-slate-400 rounded-full p-1 hover:text-white hover:bg-slate-600 transition">
                <XIcon className="h-6 w-6" />
            </button>
        </div>

        <div className="flex-grow bg-black flex items-center justify-center relative">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted={!videoUrl}
                controls={!!videoUrl}
                src={videoUrl || ''}
                className="w-full h-full object-contain"
            />
             {isProcessing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="h-12 w-12"/>
                    <p className="mt-4 font-semibold">Extracting frames from video...</p>
                </div>
            )}
        </div>

        <div className="p-4 bg-black/50 border-t border-slate-700">
            {!videoUrl ? (
                <div>
                    <p className="text-sm text-slate-300 text-center mb-4">Slowly pan your camera across the room to capture all your valuable items.</p>
                    <button
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-lg font-bold rounded-md transition ${
                            isRecording 
                            ? 'bg-danger hover:opacity-90 text-white' 
                            : 'bg-primary hover:bg-primary-dark text-white'
                        }`}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={handleRetake} 
                        disabled={isProcessing}
                        className="w-full px-6 py-3 font-semibold bg-medium/50 text-white rounded-md hover:bg-medium/70 transition disabled:opacity-50"
                    >
                        Retake
                    </button>
                    <button 
                        onClick={handleProcess} 
                        disabled={isProcessing}
                        className="w-full px-6 py-3 font-semibold bg-success text-white rounded-md hover:opacity-90 transition disabled:opacity-50"
                    >
                        {isProcessing ? 'Processing...' : 'Analyze Video'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RoomScanView;
