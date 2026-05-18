"use client";

import { useCallback, useRef, useState } from "react";

type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error";

type JoinCallArgs = {
  roomId: string;
  displayName: string;
};

type AcsCall = import("@azure/communication-calling").Call;
type AcsRemoteParticipant = import("@azure/communication-calling").RemoteParticipant;
type AcsRemoteVideoStream = import("@azure/communication-calling").RemoteVideoStream;

export function useAcsCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const [localRotation, setLocalRotation] = useState(0);
  const [remoteRotation, setRemoteRotation] = useState(0);

  const callRef = useRef<AcsCall | null>(null);
  const localRendererRef = useRef<{ dispose: () => void } | null>(null);
  const remoteRendererRef = useRef<{ dispose: () => void } | null>(null);
  const remoteAttachGenerationRef = useRef(0);
  const subscribedParticipantsRef = useRef<WeakSet<object>>(new WeakSet());
  const deviceManagerRef = useRef<
    Awaited<ReturnType<import("@azure/communication-calling").CallClient["getDeviceManager"]>> | null
  >(null);
  const camerasRef = useRef<import("@azure/communication-calling").VideoDeviceInfo[]>([]);
  const cameraIndexRef = useRef(0);
  const localVideoStreamRef = useRef<import("@azure/communication-calling").LocalVideoStream | null>(
    null,
  );
  const switchingCameraRef = useRef(false);

  const cleanupRenderers = useCallback(() => {
    remoteAttachGenerationRef.current += 1;
    localRendererRef.current?.dispose();
    remoteRendererRef.current?.dispose();
    localRendererRef.current = null;
    remoteRendererRef.current = null;

    if (localVideoRef.current) localVideoRef.current.innerHTML = "";
    if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";
    setHasRemoteVideo(false);
    setRemoteParticipantCount(0);
    subscribedParticipantsRef.current = new WeakSet();
  }, []);

  const leaveCall = useCallback(async () => {
    cleanupRenderers();
    if (callRef.current) {
      await callRef.current.hangUp();
      callRef.current = null;
    }
    setStatus("ended");
  }, [cleanupRenderers]);

  const renderRemoteStream = useCallback(async (remoteStream: AcsRemoteVideoStream) => {
    const { VideoStreamRenderer } = await import("@azure/communication-calling");

    const attach = async () => {
      const generation = ++remoteAttachGenerationRef.current;

      try {
        const renderer = new VideoStreamRenderer(remoteStream);
        const view = await renderer.createView();

        if (generation !== remoteAttachGenerationRef.current) {
          renderer.dispose();
          return;
        }

        remoteRendererRef.current?.dispose();
        remoteRendererRef.current = renderer;

        if (remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = "";
          remoteVideoRef.current.appendChild(view.target);
          setHasRemoteVideo(true);
        }
      } catch {
        if (generation === remoteAttachGenerationRef.current) {
          setHasRemoteVideo(false);
        }
      }
    };

    if (remoteStream.isAvailable) {
      await attach();
      return;
    }

    remoteStream.on("isAvailableChanged", () => {
      if (remoteStream.isAvailable) void attach();
    });
  }, []);

  const subscribeToRemoteParticipant = useCallback(
    (participant: AcsRemoteParticipant) => {
      if (subscribedParticipantsRef.current.has(participant)) {
        return;
      }
      subscribedParticipantsRef.current.add(participant);

      const handleStream = (stream: AcsRemoteVideoStream) => {
        void renderRemoteStream(stream);
      };

      participant.on("videoStreamsUpdated", (event) => {
        event.added.forEach(handleStream);
        if (event.removed.length > 0) {
          remoteAttachGenerationRef.current += 1;
          remoteRendererRef.current?.dispose();
          remoteRendererRef.current = null;
          if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";
          setHasRemoteVideo(false);
        }
      });

      participant.videoStreams.forEach(handleStream);
    },
    [renderRemoteStream],
  );

  const syncRemoteParticipants = useCallback(
    (call: AcsCall) => {
      setRemoteParticipantCount(call.remoteParticipants.length);
      call.remoteParticipants.forEach(subscribeToRemoteParticipant);
    },
    [subscribeToRemoteParticipant],
  );

  const joinCall = useCallback(
    async ({ roomId, displayName }: JoinCallArgs) => {
      setStatus("connecting");
      setError(null);
      cleanupRenderers();

      try {
        const tokenRes = await fetch("/api/acs/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        if (!tokenRes.ok) {
          const body = (await tokenRes.json()) as { error?: string };
          throw new Error(body.error ?? "Could not fetch ACS token");
        }

        const { token } = (await tokenRes.json()) as { token: string };
        const calling = await import("@azure/communication-calling");
        const common = await import("@azure/communication-common");

        const { CallClient, LocalVideoStream, VideoStreamRenderer } = calling;
        const { AzureCommunicationTokenCredential } = common;

        const callClient = new CallClient();
        const credential = new AzureCommunicationTokenCredential(token);
        const callAgent = await callClient.createCallAgent(credential, {
          displayName,
        });

        const deviceManager = await callClient.getDeviceManager();
        deviceManagerRef.current = deviceManager;
        await deviceManager.askDevicePermission({ audio: true, video: true });

        const cameras = await deviceManager.getCameras();
        camerasRef.current = cameras;
        if (cameras.length === 0) {
          throw new Error("No camera found on this device");
        }

        const localVideoStream = new LocalVideoStream(cameras[cameraIndexRef.current]);
        localVideoStreamRef.current = localVideoStream;
        const localRenderer = new VideoStreamRenderer(localVideoStream);
        localRendererRef.current = localRenderer;
        const localView = await localRenderer.createView();
        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = "";
          localVideoRef.current.appendChild(localView.target);
        }

        const call = callAgent.join(
          { groupId: roomId },
          { videoOptions: { localVideoStreams: [localVideoStream] } },
        );

        callRef.current = call;

        call.on("stateChanged", () => {
          if (call.state === "Connected") {
            setStatus("connected");
            syncRemoteParticipants(call);
          }
          if (call.state === "Disconnected") {
            setStatus("ended");
          }
        });

        call.on("remoteParticipantsUpdated", (event) => {
          event.added.forEach(subscribeToRemoteParticipant);
          setRemoteParticipantCount(call.remoteParticipants.length);
        });

        if (call.state === "Connected") {
          setStatus("connected");
          syncRemoteParticipants(call);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join call";
        setError(message);
        setStatus("error");
        cleanupRenderers();
      }
    },
    [cleanupRenderers, subscribeToRemoteParticipant, syncRemoteParticipants],
  );

  const rotateLocalVideo = useCallback(() => {
    setLocalRotation((deg) => (deg + 90) % 360);
  }, []);

  const rotateRemoteVideo = useCallback(() => {
    setRemoteRotation((deg) => (deg + 90) % 360);
  }, []);

  const switchCamera = useCallback(async () => {
    if (switchingCameraRef.current) {
      return;
    }

    const cameras = camerasRef.current;
    if (cameras.length <= 1) {
      rotateLocalVideo();
      return;
    }

    switchingCameraRef.current = true;
    cameraIndexRef.current = (cameraIndexRef.current + 1) % cameras.length;
    const call = callRef.current;
    const { LocalVideoStream, VideoStreamRenderer } = await import(
      "@azure/communication-calling"
    );

    try {
      const previousStream = localVideoStreamRef.current;
      if (call && call.state !== "Disconnected" && previousStream) {
        await call.stopVideo(previousStream);
      }

      const newStream = new LocalVideoStream(cameras[cameraIndexRef.current]);
      localVideoStreamRef.current = newStream;

      if (call && call.state !== "Disconnected") {
        await call.startVideo(newStream);
      }

      localRendererRef.current?.dispose();
      const renderer = new VideoStreamRenderer(newStream);
      localRendererRef.current = renderer;
      const view = await renderer.createView();
      if (localVideoRef.current) {
        localVideoRef.current.innerHTML = "";
        localVideoRef.current.appendChild(view.target);
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch camera";
      setError(message);
      rotateLocalVideo();
    } finally {
      switchingCameraRef.current = false;
    }
  }, [rotateLocalVideo]);

  return {
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
  };
}
