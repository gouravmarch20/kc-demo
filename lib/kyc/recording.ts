type RecorderHandle = {
  stop: () => Promise<Blob>;
};

type CapturableVideoElement = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export type RecordingBundle = {
  customerVideoBlob: Blob;
  customerVideoOnlyBlob: Blob;
  agentVideoBlob: Blob;
  combinedVideoBlob: Blob;
  fullVideoBlob: Blob;
  agentAudioBlob: Blob | null;
  mixedAudioBlob: Blob | null;
  customerMicAudioBlob: Blob | null;
  customerAudioBlob: Blob | null;
};

const videoMimeTypes = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

const audioMimeTypes = ["audio/webm;codecs=opus", "audio/webm"];

export function createObjectUrl(blob: Blob | null): string | null {
  return blob ? URL.createObjectURL(blob) : null;
}

function getSupportedMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function startRecorder(stream: MediaStream, mimeCandidates: string[]): RecorderHandle {
  const chunks: BlobPart[] = [];
  const mimeType = getSupportedMimeType(mimeCandidates);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(1000);

  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Recording failed."));
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeCandidates.at(-1) }));
        if (recorder.state === "inactive") {
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeCandidates.at(-1) }));
          return;
        }
        recorder.stop();
      }),
  };
}

function captureVideoStream(video: HTMLVideoElement): MediaStream {
  const capturableVideo = video as CapturableVideoElement;
  const capture = capturableVideo.captureStream ?? capturableVideo.mozCaptureStream;
  if (!capture) {
    throw new Error("This browser cannot record rendered video streams.");
  }
  const stream = capture.call(video) as MediaStream;
  if (stream.getVideoTracks().length === 0) {
    throw new Error("Video stream is not ready to record yet.");
  }
  return stream;
}

function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#020617";
  ctx.fillRect(x, y, width, height);

  if (!video.videoWidth || !video.videoHeight) return;

  const sourceRatio = video.videoWidth / video.videoHeight;
  const targetRatio = width / height;
  const drawWidth = sourceRatio > targetRatio ? width : height * sourceRatio;
  const drawHeight = sourceRatio > targetRatio ? width / sourceRatio : height;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
}

function createCombinedVideoStream(
  agentVideo: HTMLVideoElement,
  customerVideo: HTMLVideoElement,
): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create recording canvas.");

  let animationFrame = 0;
  const render = () => {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawVideoFrame(ctx, agentVideo, 0, 0, 640, 720);
    drawVideoFrame(ctx, customerVideo, 640, 0, 640, 720);

    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(24, 24, 120, 34);
    ctx.fillRect(664, 24, 140, 34);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillText("Agent", 44, 47);
    ctx.fillText("Customer", 684, 47);

    animationFrame = requestAnimationFrame(render);
  };
  render();

  return {
    stream: canvas.captureStream(24),
    stop: () => cancelAnimationFrame(animationFrame),
  };
}

function cloneAudioTracks(stream: MediaStream | null): MediaStreamTrack[] {
  return stream?.getAudioTracks().map((track) => track.clone()) ?? [];
}

function cloneVideoTracks(stream: MediaStream): MediaStreamTrack[] {
  return stream.getVideoTracks().map((track) => track.clone());
}

export async function startConversationRecorders({
  agentVideo,
  customerVideo,
}: {
  agentVideo: HTMLVideoElement;
  customerVideo: HTMLVideoElement;
}): Promise<{ stop: () => Promise<RecordingBundle> }> {
  const micStream = await navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .catch(() => null);
  const customerAudioTracks = cloneAudioTracks(micStream);

  const agentVideoStream = captureVideoStream(agentVideo);
  const customerVideoStream = captureVideoStream(customerVideo);
  const combined = createCombinedVideoStream(agentVideo, customerVideo);
  const agentAudioTracks = cloneAudioTracks(agentVideoStream);

  const agentVideoOnly = new MediaStream(cloneVideoTracks(agentVideoStream));
  const customerVideoOnly = new MediaStream(cloneVideoTracks(customerVideoStream));
  const customerVideoWithAudio = new MediaStream([
    ...cloneVideoTracks(customerVideoStream),
    ...customerAudioTracks.map((track) => track.clone()),
  ]);
  const combinedVideoOnly = new MediaStream(cloneVideoTracks(combined.stream));
  const combinedWithAudio = new MediaStream([
    ...cloneVideoTracks(combined.stream),
    ...customerAudioTracks.map((track) => track.clone()),
  ]);
  const customerAudioOnly =
    customerAudioTracks.length > 0 ? new MediaStream(customerAudioTracks.map((track) => track.clone())) : null;
  const agentAudioOnly =
    agentAudioTracks.length > 0 ? new MediaStream(agentAudioTracks.map((track) => track.clone())) : null;
  const mixedAudioOnly =
    agentAudioTracks.length + customerAudioTracks.length > 0
      ? new MediaStream([
          ...agentAudioTracks.map((track) => track.clone()),
          ...customerAudioTracks.map((track) => track.clone()),
        ])
      : null;

  const agentRecorder = startRecorder(agentVideoOnly, videoMimeTypes);
  const customerVideoOnlyRecorder = startRecorder(customerVideoOnly, videoMimeTypes);
  const customerRecorder = startRecorder(customerVideoWithAudio, videoMimeTypes);
  const combinedRecorder = startRecorder(combinedVideoOnly, videoMimeTypes);
  const fullRecorder = startRecorder(combinedWithAudio, videoMimeTypes);
  const agentAudioRecorder = agentAudioOnly ? startRecorder(agentAudioOnly, audioMimeTypes) : null;
  const mixedAudioRecorder = mixedAudioOnly ? startRecorder(mixedAudioOnly, audioMimeTypes) : null;
  const audioRecorder = customerAudioOnly ? startRecorder(customerAudioOnly, audioMimeTypes) : null;

  return {
    stop: async () => {
      const [
        agentVideoBlob,
        customerVideoOnlyBlob,
        customerVideoBlob,
        combinedVideoBlob,
        fullVideoBlob,
        agentAudioBlob,
        mixedAudioBlob,
        customerAudioBlob,
      ] =
        await Promise.all([
          agentRecorder.stop(),
          customerVideoOnlyRecorder.stop(),
          customerRecorder.stop(),
          combinedRecorder.stop(),
          fullRecorder.stop(),
          agentAudioRecorder?.stop() ?? Promise.resolve(null),
          mixedAudioRecorder?.stop() ?? Promise.resolve(null),
          audioRecorder?.stop() ?? Promise.resolve(null),
        ]);

      combined.stop();
      [
        ...agentVideoStream.getTracks(),
        ...customerVideoStream.getTracks(),
        ...agentVideoOnly.getTracks(),
        ...customerVideoOnly.getTracks(),
        ...customerVideoWithAudio.getTracks(),
        ...combinedVideoOnly.getTracks(),
        ...combinedWithAudio.getTracks(),
        ...(agentAudioOnly?.getTracks() ?? []),
        ...(mixedAudioOnly?.getTracks() ?? []),
        ...(customerAudioOnly?.getTracks() ?? []),
        ...(micStream?.getTracks() ?? []),
      ].forEach((track) => track.stop());

      return {
        customerVideoBlob,
        customerVideoOnlyBlob,
        agentVideoBlob,
        combinedVideoBlob,
        fullVideoBlob,
        agentAudioBlob,
        mixedAudioBlob,
        customerMicAudioBlob: customerAudioBlob,
        customerAudioBlob,
      };
    },
  };
}

