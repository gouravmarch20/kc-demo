import { KYC_QUESTIONS_CONFIG } from "@/lib/kyc/constants";
import type { KycAssistedStage, KycJourneyState, KycRoomState } from "@/lib/kyc/types";

export const ASSISTED_STEP_LABELS = [
  { stage: "video" as const, short: "0", label: "Agent video" },
  { stage: "photo" as const, short: "1", label: "Photo" },
  { stage: "questions" as const, short: "2", label: "Questionnaire" },
  { stage: "otp" as const, short: "3", label: "OTP" },
];

export function isVideoComplete(room: KycRoomState | null): boolean {
  if (!room) return false;
  return Boolean(room.callConnected && !room.acsFailed);
}

export function isPhotoComplete(
  room: KycRoomState | null,
  journey: KycJourneyState,
): boolean {
  return Boolean(room?.customerPhoto || journey.media.photoUrl || journey.media.photoDataUrl);
}

export function isQuestionsComplete(room: KycRoomState | null): boolean {
  return KYC_QUESTIONS_CONFIG.every((q) => room?.answers?.[q.id]?.trim());
}

export function isOtpComplete(room: KycRoomState | null, journey: KycJourneyState): boolean {
  return journey.otpVerified || Boolean(room?.otpVerified);
}

export function stageIndex(stage: KycAssistedStage): number {
  if (stage === "video") return 0;
  if (stage === "photo") return 1;
  if (stage === "questions") return 2;
  if (stage === "otp" || stage === "complete") return 3;
  return 0;
}
