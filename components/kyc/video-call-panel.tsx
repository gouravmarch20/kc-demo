"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useAcsCall } from "@/hooks/useAcsCall";
import {
  getVideoFromContainer,
  snapshotVideoElement,
} from "@/lib/kyc/capture-stream";
import {
  createObjectUrl,
  startConversationRecorders,
} from "@/lib/kyc/recording";
import type { KycRecordingState } from "@/lib/kyc/types";

export type AcsCallStatePayload = {
  status: "idle" | "connecting" | "connected" | "ended" | "error";
  error: string | null;
  remoteParticipantCount: number;
  callConnected: boolean;
  acsFailed: boolean;
};

export type VideoCallPanelHandle = {
  stopRecording: () => Promise<boolean>;
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
  recordingMode?: "customer-step-6";
  onRecordingReady?: (recordings: KycRecordingState) => void;
};

export const VideoCallPanel = forwardRef<VideoCallPanelHandle, VideoCallPanelProps>(
function VideoCallPanel(
  {
    roomId,
    displayName,
    role,
    variant = "default",
    agentFocusMode = false,
    onAgentFocusChange,
    onCallStateChange,
    onRemoteSnapshot,
    remoteSnapshotLabel = "Capture customer photo",
    recordingMode,
    onRecordingReady,
  },
  ref,
) {
  const customerFocus = variant === "customer-focus";
  const showLocal = true;
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
  } = useAcsCall();
  const [joined, setJoined] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState<string | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "starting" | "recording" | "saving" | "ready"
  >("idle");
  const hadConnectedRef = useRef(false);
  const recorderRef = useRef<Awaited<ReturnType<typeof startConversationRecorders>> | null>(
    null,
  );
  const autoStartAttemptedRef = useRef(false);

  useEffect(() => {
    return () => {
      void recorderRef.current?.stop().catch(() => undefined);
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

  const startReviewRecording = useCallback(async () => {
    const agentVideo = getVideoFromContainer(remoteVideoRef.current);
    const customerVideo = getVideoFromContainer(localVideoRef.current);
    if (!agentVideo || !customerVideo) {
      setRecordingMessage("Both agent and customer video must be visible before recording.");
      return;
    }

    setRecordingStatus("starting");
    setRecordingMessage("Starting recording…");
    try {
      recorderRef.current = await startConversationRecorders({
        agentVideo,
        customerVideo,
      });
      setRecordingStatus("recording");
      setRecordingMessage("Recording conversation preview. Stop before continuing.");
    } catch (err) {
      setRecordingStatus("idle");
      setRecordingMessage(err instanceof Error ? err.message : "Could not start recording.");
    }
  }, [localVideoRef, remoteVideoRef]);

  const stopReviewRecording = useCallback(async (): Promise<boolean> => {
    const recorder = recorderRef.current;
    if (!recorder) return recordingStatus === "ready";

    setRecordingStatus("saving");
    setRecordingMessage("Saving recording previews…");
    try {
      const bundle = await recorder.stop();
      recorderRef.current = null;
      onRecordingReady?.({
        customerVideoUrl: createObjectUrl(bundle.customerVideoBlob),
        customerVideoOnlyUrl: createObjectUrl(bundle.customerVideoOnlyBlob),
        agentVideoUrl: createObjectUrl(bundle.agentVideoBlob),
        combinedVideoUrl: createObjectUrl(bundle.combinedVideoBlob),
        fullVideoUrl: createObjectUrl(bundle.fullVideoBlob),
        customerMicAudioUrl: createObjectUrl(bundle.customerMicAudioBlob),
        customerAudioUrl: createObjectUrl(bundle.customerAudioBlob),
        mixedAudioUrl: createObjectUrl(bundle.mixedAudioBlob),
        agentAudioUrl: createObjectUrl(bundle.agentAudioBlob),
        recordedAt: Date.now(),
      });
      setRecordingStatus("ready");
      setRecordingMessage("Recording previews are ready.");
      return true;
    } catch (err) {
      setRecordingStatus("recording");
      setRecordingMessage(err instanceof Error ? err.message : "Could not save recording.");
      return false;
    }
  }, [onRecordingReady, recordingStatus]);

  useImperativeHandle(ref, () => ({
    stopRecording: stopReviewRecording,
  }));

  const waitingForPeer =
    joined && status === "connected" && remoteParticipantCount === 0;
  const waitingForVideo =
    joined && status === "connected" && remoteParticipantCount > 0 && !hasRemoteVideo;
  const showReviewRecordingControls = recordingMode === "customer-step-6";
  const canStartReviewRecording =
    joined && status === "connected" && hasRemoteVideo && recordingStatus === "idle";

  useEffect(() => {
    if (
      recordingMode !== "customer-step-6" ||
      autoStartAttemptedRef.current ||
      !canStartReviewRecording
    ) {
      return;
    }

    autoStartAttemptedRef.current = true;
    void startReviewRecording();
  }, [canStartReviewRecording, recordingMode, startReviewRecording]);

  const videoTransform = (deg: number) =>
    deg ? { transform: `rotate(${deg}deg)`, transformOrigin: "center center" } : undefined;
  const remoteFrameClass = customerFocus
    ? "aspect-[3/4] min-h-56 max-h-[46vh] w-full sm:aspect-video sm:max-h-none"
    : "aspect-[4/3] sm:aspect-video";
  const videoHostClass = "acs-video-host h-full w-full";

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-900/5 p-3">
      {customerFocus ? (
        <p className="text-center text-xs font-medium text-slate-600">Live agent video</p>
      ) : null}

      <div
        className={`grid gap-3 ${
          showLocal && !customerFocus && !agentFocusMode ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {showRemote ? (
          <div className={customerFocus || agentFocusMode ? "order-1" : ""}>
            {!customerFocus ? (
              <p className="mb-1 text-xs font-medium text-zinc-500">
                {role === "customer" ? "Agent" : "Customer"}
              </p>
            ) : null}
            <div
              className={`relative overflow-hidden rounded-lg bg-zinc-900 ${
                remoteFrameClass
              } ${agentFocusMode ? "ring-2 ring-emerald-500" : ""}`}
            >
              <div
                ref={remoteVideoRef}
                className={videoHostClass}
                style={videoTransform(remoteRotation)}
              />
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
            <p className="mb-1 text-xs font-medium text-zinc-500">
              {customerFocus ? "Your video" : "You"}
            </p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-900 sm:aspect-video">
              <div
                ref={localVideoRef}
                className={videoHostClass}
                style={videoTransform(localRotation)}
              />
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
            {showReviewRecordingControls ? (
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                {recordingStatus === "recording"
                  ? "Recording automatically"
                  : recordingStatus === "ready"
                    ? "Recording saved"
                    : recordingStatus === "saving"
                      ? "Saving recording"
                      : "Recording starts automatically after video connects"}
              </span>
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
});
