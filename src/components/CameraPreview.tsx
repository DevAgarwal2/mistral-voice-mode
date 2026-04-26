"use client";

import { useRef, useEffect } from "react";

interface CameraPreviewProps {
  stream: MediaStream | null;
  onClose: () => void;
}

export default function CameraPreview({ stream, onClose }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="fixed bottom-20 right-4 z-30 w-28 h-36 md:w-36 md:h-44 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <button
        onClick={onClose}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
      >
        ✕
      </button>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#fa500f]/90 text-white text-[10px] font-medium">
        Live
      </div>
    </div>
  );
}
