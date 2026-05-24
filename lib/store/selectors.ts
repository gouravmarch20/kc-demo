import { initialKycJourneyState } from "@/lib/store/kyc-slice";
import type { KycJourneyState, KycMediaState } from "@/lib/kyc/types";
import type { RootState } from "@/lib/store/store";

function normalizeMedia(media: unknown): KycMediaState {
  const base = initialKycJourneyState.media;
  if (!media || typeof media !== "object") {
    return base;
  }
  const m = media as Record<string, unknown>;
  const recordings =
    m.recordings && typeof m.recordings === "object"
      ? (m.recordings as Record<string, unknown>)
      : {};
  const asUrl = (value: unknown) => (typeof value === "string" ? value : null);
  const asTimestamp = (value: unknown) => (typeof value === "number" ? value : null);
  return {
    photoDataUrl: asUrl(m.photoDataUrl),
    photoUrl: asUrl(m.photoUrl),
    recordings: {
      customerVideoUrl: asUrl(recordings.customerVideoUrl),
      customerVideoOnlyUrl: asUrl(recordings.customerVideoOnlyUrl),
      agentVideoUrl: asUrl(recordings.agentVideoUrl),
      combinedVideoUrl: asUrl(recordings.combinedVideoUrl),
      fullVideoUrl: asUrl(recordings.fullVideoUrl),
      customerMicAudioUrl: asUrl(recordings.customerMicAudioUrl),
      customerAudioUrl: asUrl(recordings.customerAudioUrl),
      mixedAudioUrl: asUrl(recordings.mixedAudioUrl),
      agentAudioUrl: asUrl(recordings.agentAudioUrl),
      recordedAt: asTimestamp(recordings.recordedAt),
    },
  };
}

/** Normalize persisted KYC state (handles legacy nested / partial shapes). */
export function selectKycJourney(state: RootState): KycJourneyState {
  const raw = state.kyc as KycJourneyState & { kyc?: KycJourneyState };

  if (raw && typeof raw === "object" && raw.kyc && typeof raw.kyc === "object") {
    const inner = raw.kyc;
    return {
      ...initialKycJourneyState,
      ...inner,
      media: normalizeMedia(inner.media),
    };
  }

  if (!raw || typeof raw !== "object") {
    return initialKycJourneyState;
  }

  return {
    ...initialKycJourneyState,
    ...raw,
    media: normalizeMedia(raw.media),
  };
}
