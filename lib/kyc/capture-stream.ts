/** Resolve a video element inside an ACS renderer container div. */
export function getVideoFromContainer(container: HTMLDivElement | null): HTMLVideoElement | null {
  if (!container) return null;
  return container.querySelector("video");
}

/** Snapshot a video element to a JPEG data URL (used to capture the customer photo). */
export function snapshotVideoElement(video: HTMLVideoElement, maxWidth = 720): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const width = Math.min(maxWidth, video.videoWidth);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.88);
}
