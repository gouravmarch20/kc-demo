"use client";

type AcsFailedBannerProps = {
  message?: string | null;
};

export function AcsFailedBanner({ message }: AcsFailedBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 px-4 py-4 text-red-900"
    >
      <p className="text-sm font-bold">ACS connection failed</p>
      <p className="mt-1 text-sm text-red-800">
        {message ??
          "The video call disconnected or could not connect. Tap Join video again or ask your agent to reconnect."}
      </p>
    </div>
  );
}
