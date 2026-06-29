import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, RotateCw, RefreshCw, Trash2, Video, AlertCircle } from "lucide-react";

interface CameraCaptureProps {
  onPhotoCaptured: (base64Data: string) => void;
  savedPhoto: string | null;
  onClearPhoto: () => void;
}

export default function CameraCapture({ onPhotoCaptured, savedPhoto, onClearPhoto }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get available video inputs
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.enumerateDevices()
        .then((allDevices) => {
          const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
          setDevices(videoDevices);
        })
        .catch((err) => {
          console.error("Error listing video devices:", err);
        });
    }
  }, [isCameraActive]);

  // Start stream when camera is active, device changes, or facing mode changes
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive, selectedDeviceId, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } } 
          : { facingMode: facingMode },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Gagal mengakses kamera. Pastikan Anda memberikan izin kamera.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Match canvas dimensions to the video stream
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.85);
        onPhotoCaptured(base64Image);
        setIsCameraActive(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onPhotoCaptured(reader.result);
          setIsCameraActive(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFacingMode = () => {
    setSelectedDeviceId(""); // Clear exact device selection so facingMode takes precedence
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="space-y-3" id="camera-capture-container">
      <label className="block text-sm font-semibold text-slate-700">Foto Langsung / Unggah Foto *</label>

      {savedPhoto ? (
        // Preview State
        <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center group" id="photo-preview">
          <img 
            src={savedPhoto} 
            alt="Preview Tangkapan" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => {
                onClearPhoto();
                setIsCameraActive(true);
              }}
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
              title="Ambil Ulang"
              type="button"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClearPhoto}
              className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 cursor-pointer"
              title="Hapus Foto"
              type="button"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-xs px-2.5 py-1 rounded-md font-mono">
            Foto Siap di-Submit
          </div>
        </div>
      ) : isCameraActive ? (
        // Live Camera Stream State
        <div className="relative border-2 border-dashed border-emerald-400 bg-slate-950 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center" id="live-camera">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Device Selector Dropdown (Top Right) */}
          {devices.length > 0 && (
            <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white rounded-lg p-1.5 px-2 text-[11px] flex items-center gap-1.5 max-w-[200px] border border-slate-700 shadow-sm">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent border-none text-white text-[11px] font-medium focus:outline-hidden cursor-pointer w-full"
              >
                <option value="" className="text-slate-900">
                  Otomatis ({facingMode === "user" ? "Depan" : "Belakang"})
                </option>
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId} className="text-slate-900">
                    {device.label || `Kamera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Controls Overlay */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-6">
            {/* Toggle Camera Source Button (Front/Back) */}
            <button
              onClick={toggleFacingMode}
              className="flex items-center gap-1 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg shadow-md transition-all active:scale-95 text-xs font-semibold border border-slate-700/50 cursor-pointer"
              title="Ganti Kamera Depan / Belakang"
              type="button"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{facingMode === "user" ? "Kamera Belakang" : "Kamera Depan"}</span>
            </button>
            
            {/* Capture Trigger Button */}
            <button
              onClick={handleCapture}
              className="p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-transform active:scale-90 scale-110 flex items-center justify-center cursor-pointer border border-emerald-400"
              title="Ambil Foto"
              type="button"
            >
              <Camera className="w-6 h-6" />
            </button>

            {/* Cancel/Close Button */}
            <button
              onClick={() => setIsCameraActive(false)}
              className="flex items-center gap-1 px-3 py-2 bg-rose-600/95 hover:bg-rose-700 text-white rounded-lg shadow-md transition-all active:scale-95 text-xs font-semibold cursor-pointer"
              title="Batalkan Kamera"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
          </div>

          <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5 animate-pulse font-medium">
            <Video className="w-3.5 h-3.5" /> Live Kamera ({facingMode === "user" ? "Depan" : "Belakang"})
          </div>
        </div>
      ) : (
        // Placeholder / Actions State
        <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl bg-slate-50 p-8 text-center transition-all flex flex-col items-center justify-center gap-4 min-h-[220px]" id="photo-actions-placeholder">
          <div className="p-3 bg-slate-100 rounded-full text-slate-500">
            <Camera className="w-8 h-8" />
          </div>
          
          <div className="max-w-xs">
            <p className="text-sm font-medium text-slate-700">Ambil foto pelanggan langsung dari kamera studio atau unggah file</p>
            <p className="text-xs text-slate-400 mt-1">Mendukung format JPG, JPEG, PNG</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 text-xs py-1.5 px-3 rounded-lg border border-rose-100 max-w-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <button
              onClick={() => setIsCameraActive(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-5 rounded-lg shadow-sm transition-all hover:shadow-md cursor-pointer"
              type="button"
            >
              <Camera className="w-4 h-4" />
              Ambil Foto Langsung
            </button>

            <label className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-medium py-2.5 px-5 rounded-lg shadow-xs transition-colors cursor-pointer">
              <ImageIcon className="w-4 h-4" />
              Unggah File
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
      )}

      {/* Hidden canvas for drawing capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
