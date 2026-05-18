"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  value: string | null;
  readOnly?: boolean;
  showFaceGuide?: boolean;
  onCapture: (dataUrl: string) => void;
  onUpload?: (dataUrl: string) => Promise<void>;
};

export function CameraCapture({
  value,
  readOnly,
  showFaceGuide,
  onCapture,
  onUpload,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null | undefined>(undefined);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<string>("Camera not started");
  const [uploading, setUploading] = useState(false);
  const preview = localPreview === undefined ? value : localPreview;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (readOnly) return;
    stopCamera();
    setStatus("Requesting camera permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setStatus("Camera ready");
    } catch {
      setStatus("Camera permission blocked or unavailable");
    }
  }, [readOnly, stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;

    // TODO: Azure Camera SDK integration can replace browser capture here.
    const canvas = document.createElement("canvas");
    const width = 720;
    const height = Math.round((video.videoHeight / video.videoWidth) * width) || 540;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    setLocalPreview(dataUrl);
    onCapture(dataUrl);
    stopCamera();

    if (onUpload) {
      setUploading(true);
      setStatus("Uploading captured photo");
      try {
        await onUpload(dataUrl);
        setStatus("Photo stored locally");
      } catch {
        setStatus("Photo upload failed");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Captured customer" className="h-full w-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            {showFaceGuide && cameraOn ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-full border-4 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
              </div>
            ) : null}
            {!cameraOn ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">
                Start camera to capture the customer photo.
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{uploading ? "Uploading..." : status}</p>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            {preview ? (
              <button
                type="button"
                onClick={() => {
                  setLocalPreview(null);
                  setStatus("Ready for retake");
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Retake
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Start Camera
              </button>
            )}
            {!preview && cameraOn ? (
              <button
                type="button"
                onClick={() => void capture()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Capture Photo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        TODO: Azure Face Verification, Liveness Detection, and OCR hooks attach after upload.
      </div>
    </div>
  );
}
