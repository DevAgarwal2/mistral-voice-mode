"use client";

import { useRef, useEffect } from "react";

interface CameraPreviewProps {
  stream: MediaStream | null;
  onClose: () => void;
}

export default function CameraPreview({ stream, onClose }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="fixed inset-x-0 bottom-[72px] z-30 md:bottom-auto md:top-20 md:right-4 md:left-auto md:w-48 md:h-60">
      <div className="relative w-full h-44 md:w-48 md:h-60 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-black mx-auto md:mx-0 max-w-sm">
        <video
          ref={videoRef}
          id="camera-preview-video"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80 transition-colors backdrop-blur-sm"
        >
          ✕
        </button>
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live
        </div>
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
