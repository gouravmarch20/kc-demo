"use client";

import { useEffect, useRef, useState } from "react";
import { useAcsCall } from "@/hooks/useAcsCall";
import {
  getVideoFromContainer,
  snapshotVideoElement,
} from "@/lib/kyc/capture-stream";

export type AcsCallStatePayload = {
  status: "idle" | "connecting" | "connected" | "ended" | "error";
  error: string | null;
  remoteParticipantCount: number;
  callConnected: boolean;
  acsFailed: boolean;
};

type VideoCallPanelProps = {
  roomId: string;
  displayName: string;
  role: "customer" | "agent";
  variant?: "default" | "customer-focus" | "agent";
  agentFocusMode?: boolean;
  onAgentFocusChange?: (focused: boolean) => void;
  onCallStateChange?: (state: AcsCallStatePayload) => void;
  onRemoteSnapshot?: (dataUrl: string) => void | Promise<void>;
  remoteSnapshotLabel?: string;
};

export function VideoCallPanel({
  roomId,
  displayName,
  role,
  variant = "default",
  agentFocusMode = false,
  onAgentFocusChange,
  onCallStateChange,
  onRemoteSnapshot,
  remoteSnapshotLabel = "Capture customer photo",
}: VideoCallPanelProps) {
  const customerFocus = variant === "customer-focus";
  const showLocal = !customerFocus;
  const showRemote = true;

  const {
    status,
    error,
    remoteParticipantCount,
    hasRemoteVideo,
    localRotation,
    remoteRotation,
    localVideoRef,
    remoteVideoRef,
    joinCall,
    leaveCall,
    rotateLocalVideo,
    rotateRemoteVideo,
    switchCamera,
  } = useAcsCall();
  const [joined, setJoined] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const hadConnectedRef = useRef(false);

  useEffect(() => {
    return () => {
      void leaveCall();
    };
  }, [leaveCall]);

  useEffect(() => {
    const callConnected =
      status === "connected" && remoteParticipantCount > 0;
    if (callConnected) {
      hadConnectedRef.current = true;
    }
    const acsFailed =
      status === "error" ||
      (joined && hadConnectedRef.current && status === "ended");

    onCallStateChange?.({
      status,
      error,
      remoteParticipantCount,
      callConnected,
      acsFailed,
    });
  }, [status, error, remoteParticipantCount, joined, onCallStateChange]);

  const handleJoin = async () => {
    await joinCall({ roomId, displayName });
    setJoined(true);
  };

  const captureRemoteSnapshot = async () => {
    const remoteVideo = getVideoFromContainer(remoteVideoRef.current);
    if (!remoteVideo) {
      setRecordingMessage("No customer video yet.");
      return;
    }
    const dataUrl = snapshotVideoElement(remoteVideo);
    if (!dataUrl) {
      setRecordingMessage("Could not capture customer frame.");
      return;
    }
    setSnapshotting(true);
    setRecordingMessage("Sending photo…");
    try {
      await onRemoteSnapshot?.(dataUrl);
      setRecordingMessage("Photo captured.");
    } catch (err) {
      setRecordingMessage(err instanceof Error ? err.message : "Photo capture failed");
    } finally {
      setSnapshotting(false);
    }
  };

  const waitingForPeer =
    joined && status === "connected" && remoteParticipantCount === 0;
  const waitingForVideo =
    joined && status === "connected" && remoteParticipantCount > 0 && !hasRemoteVideo;

  const videoTransform = (deg: number) =>
    deg ? { transform: `rotate(${deg}deg)`, transformOrigin: "center center" } : undefined;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-900/5 p-3">
      {customerFocus ? (
        <p className="text-center text-xs font-medium text-slate-600">Live agent video</p>
      ) : null}

      <div className={`grid gap-3 ${showLocal && !agentFocusMode ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {showRemote ? (
          <div className={customerFocus || agentFocusMode ? "order-1" : ""}>
            {!customerFocus ? (
              <p className="mb-1 text-xs font-medium text-zinc-500">
                {role === "customer" ? "Agent" : "Customer"}
              </p>
            ) : null}
            <div
              className={`relative overflow-hidden rounded-lg bg-zinc-900 ${
                customerFocus ? "aspect-[4/5] max-h-[50vh] w-full" : "aspect-video"
              } ${agentFocusMode ? "ring-2 ring-emerald-500" : ""}`}
            >
              <div ref={remoteVideoRef} className="h-full w-full" style={videoTransform(remoteRotation)} />
              {(waitingForPeer || waitingForVideo) && (
                <p className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-zinc-400">
                  {waitingForPeer ? "Waiting for agent…" : "Starting video…"}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {showLocal ? (
          <div className={agentFocusMode ? "order-2" : ""}>
            <p className="mb-1 text-xs font-medium text-zinc-500">You</p>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
              <div ref={localVideoRef} className="h-full w-full" style={videoTransform(localRotation)} />
              {status === "idle" && (
                <p className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
                  Tap Join video
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {recordingMessage ? (
        <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs text-slate-700">{recordingMessage}</p>
      ) : null}

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {!joined ? (
          <button
            type="button"
            onClick={() => void handleJoin()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Join video
          </button>
        ) : (
          <>
            {onRemoteSnapshot ? (
              <button
                type="button"
                disabled={snapshotting || !hasRemoteVideo || status !== "connected"}
                onClick={() => void captureRemoteSnapshot()}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {snapshotting ? "Capturing…" : remoteSnapshotLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setJoined(false);
                void leaveCall();
              }}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
            >
              End call
            </button>
            {role === "agent" && onAgentFocusChange ? (
              <button
                type="button"
                onClick={() => onAgentFocusChange(!agentFocusMode)}
                className="rounded-lg border px-3 py-2 text-xs font-medium"
              >
                Focus customer
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
