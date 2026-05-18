"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AcsFailedBanner } from "@/components/kyc/acs-failed-banner";
import { AssistedStepBar } from "@/components/kyc/assisted-step-bar";
import {
  VideoCallPanel,
  type AcsCallStatePayload,
} from "@/components/kyc/video-call-panel";
import { useKycRoom } from "@/hooks/useKycRoom";
import {
  isOtpComplete,
  isPhotoComplete,
  isQuestionsComplete,
  isVideoComplete,
  stageIndex,
} from "@/lib/kyc/assisted-steps";
import { KYC_QUESTIONS_CONFIG } from "@/lib/kyc/constants";
import { initialKycJourneyState } from "@/lib/store/kyc-slice";
import type { KycAssistedStage, KycJourneyState } from "@/lib/kyc/types";
import {
  btnDark,
  btnPrimaryBlock,
  btnSecondary,
  btnSecondaryCompact,
  card,
  cardSoft,
  input,
  inputMono,
  noticeInfo,
  noticeWarning,
  pillBrand,
  pillSuccess,
  pillWarning,
} from "@/lib/ui/styles";

const emptyJourney: KycJourneyState = initialKycJourneyState;

export function AgentPortal() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get("room") ?? "";
  const initialToken = searchParams.get("token") ?? "";
  const [roomId, setRoomId] = useState(initialRoom);
  const [roomSecret, setRoomSecret] = useState(initialToken);
  const [joined, setJoined] = useState(Boolean(initialRoom && initialToken));
  const [agentOtp, setAgentOtp] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);

  const { room, connected, patchRoom, sendOtp, fetchAgentOtp } = useKycRoom(
    joined ? roomId : "",
    "agent",
    roomSecret,
  );

  const stage: KycAssistedStage = room?.assistedStage ?? "video";
  const stageIdx = stageIndex(stage);

  const journeyForChecks: KycJourneyState = {
    ...emptyJourney,
    otpVerified: Boolean(room?.otpVerified),
  };

  const videoDone = isVideoComplete(room);
  const photoDone = isPhotoComplete(room, journeyForChecks);
  const questionsDone = isQuestionsComplete(room);
  const otpDone = isOtpComplete(room, journeyForChecks);

  const questionIndex = room?.questionIndex ?? 0;
  const activeQuestion = KYC_QUESTIONS_CONFIG[questionIndex] ?? KYC_QUESTIONS_CONFIG[0];

  const handleCallState = useCallback(
    (state: AcsCallStatePayload) => {
      void patchRoom({
        callConnected: state.callConnected,
        acsFailed: state.acsFailed,
        acsErrorMessage: state.error,
        ...(state.acsFailed
          ? { agentEvent: "ACS failed — ask customer to tap Join video again (Step 0)." }
          : state.callConnected
            ? { agentEvent: "On video with customer. Continue when ready." }
            : {}),
      });
    },
    [patchRoom],
  );

  const handlePhotoCaptured = useCallback(
    async (dataUrl: string) => {
      if (!roomId) return;
      setPhotoStatus("Uploading photo…");
      try {
        const res = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, roomId }),
        });
        const payload = (await res.json()) as { url?: string };
        if (!res.ok || !payload.url) throw new Error("Upload failed");
        await patchRoom({
          customerPhoto: dataUrl,
          agentEvent: "Photo captured by agent — looks good.",
        });
        setPhotoStatus("Photo saved.");
      } catch (err) {
        setPhotoStatus(err instanceof Error ? err.message : "Photo upload failed");
      }
    },
    [roomId, patchRoom],
  );

  const updateAnswer = (id: string, value: string) => {
    void patchRoom({
      answers: { ...(room?.answers ?? {}), [id]: value },
    });
  };

  const goToPhoto = () => {
    if (!videoDone) return;
    void patchRoom({
      assistedStage: "photo",
      agentEvent: "Step 1: Stay in frame. Agent will capture your photo.",
    });
  };

  const goToQuestions = () => {
    if (!photoDone) return;
    void patchRoom({
      assistedStage: "questions",
      questionIndex: 0,
      agentEvent: "Step 2: Answer each question on the call — your agent is typing your reply.",
    });
  };

  const goToOtp = async () => {
    if (!questionsDone) return;
    setOtpSending(true);
    try {
      const result = await sendOtp();
      if (!result.ok) return;
      const code = result.demoOtp ?? (await fetchAgentOtp());
      setAgentOtp(code);
      await patchRoom({
        assistedStage: "otp",
        otpSent: true,
        agentEvent: "Step 3: OTP sent. Please enter the code on your screen.",
      });
    } finally {
      setOtpSending(false);
    }
  };

  const completeVerification = () => {
    if (!otpDone) return;
    void patchRoom({
      assistedStage: "complete",
      otpVerified: true,
      status: "completed",
      agentEvent: "Verification complete. Thank you.",
    });
  };

  useEffect(() => {
    if (!joined || !roomId || !roomSecret || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void patchRoom({
      assistedStage: "video",
      step: 6,
      agentEvent: "Step 0: Join video on both sides.",
    });
  }, [joined, roomId, roomSecret, patchRoom]);

  useEffect(() => {
    if (!joined || !room?.otpSent || agentOtp) return;
    void fetchAgentOtp().then((code) => {
      if (code) setAgentOtp(code);
    });
  }, [agentOtp, fetchAgentOtp, joined, room?.otpSent]);

  if (!joined) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Agent</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Join customer room</h1>
          <p className="mt-2 text-sm text-slate-500">
            Paste the room code and access token shown on the customer&apos;s screen.
          </p>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-slate-800">
            Room code
            <input
              className={`mt-2 ${inputMono}`}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.trim())}
            />
          </label>
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            Access token
            <input
              className={`mt-2 ${inputMono}`}
              value={roomSecret}
              onChange={(e) => setRoomSecret(e.target.value.trim())}
            />
          </label>
          <button
            type="button"
            disabled={!roomId || !roomSecret}
            onClick={() => setJoined(true)}
            className={`mt-5 ${btnPrimaryBlock}`}
          >
            Enter console
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-red-600">Agent console</p>
            <h1 className="text-lg font-bold text-slate-950">Guide customer step by step</h1>
          </div>
          <span className={connected ? pillSuccess : pillWarning}>
            {connected ? "WebSocket live" : "WebSocket offline"}
          </span>
        </div>
        <div className="mt-4">
          <AssistedStepBar activeStage={stage} />
        </div>
        <p className={`mt-3 ${noticeInfo}`}>
          {room?.agentEvent ?? "Connect on video, then walk through each step."}
        </p>
      </header>

      {room?.acsFailed ? <AcsFailedBanner message={room.acsErrorMessage} /> : null}

      <VideoCallPanel
        roomId={roomId}
        displayName="Verification Agent"
        role="agent"
        variant="agent"
        onCallStateChange={handleCallState}
        onRemoteSnapshot={stageIdx === 1 ? handlePhotoCaptured : undefined}
        remoteSnapshotLabel={room?.customerPhoto ? "Recapture customer photo" : "Capture customer photo"}
      />

      {stageIdx === 0 ? (
        <section className={`space-y-3 ${card}`}>
          <h2 className="text-base font-bold text-slate-950">Step 0 — Video with customer</h2>
          <p className="text-sm text-slate-600">
            Join above. Wait until you can see and hear the customer before continuing.
          </p>
          <button
            type="button"
            disabled={!videoDone}
            onClick={goToPhoto}
            className={btnPrimaryBlock}
          >
            {videoDone ? "Complete Step 0 → Photo" : "Waiting for video connection…"}
          </button>
        </section>
      ) : null}

      {stageIdx === 1 ? (
        <section className={`space-y-3 ${card}`}>
          <h2 className="text-base font-bold text-slate-950">Step 1 — Capture customer photo</h2>
          <p className="text-sm text-slate-600">
            Ask the customer to hold still and look at the camera. Use the
            <strong> Capture customer photo </strong>
            button on the video panel above.
          </p>
          {room?.customerPhoto ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={room.customerPhoto} alt="Customer" className="h-48 w-full object-cover" />
            </div>
          ) : (
            <p className={noticeWarning}>No photo captured yet.</p>
          )}
          {photoStatus ? <p className="text-xs text-slate-500">{photoStatus}</p> : null}
          <button
            type="button"
            disabled={!photoDone}
            onClick={goToQuestions}
            className={btnPrimaryBlock}
          >
            {photoDone ? "Complete Step 1 → Questionnaire" : "Capture photo to continue"}
          </button>
        </section>
      ) : null}

      {stageIdx === 2 ? (
        <section className={`space-y-4 ${card}`}>
          <h2 className="text-base font-bold text-slate-950">Step 2 — Questionnaire</h2>
          <p className="text-sm text-slate-600">
            Ask each question on the call and type the customer&apos;s response.
          </p>
          <div className={cardSoft}>
            <div className="flex items-center justify-between">
              <span className={pillBrand}>
                Question {questionIndex + 1} / {KYC_QUESTIONS_CONFIG.length}
              </span>
              <span className="text-xs text-slate-500">
                {Object.values(room?.answers ?? {}).filter((v) => v?.trim()).length}/
                {KYC_QUESTIONS_CONFIG.length} answered
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-slate-950">{activeQuestion.label}</p>
            <input
              value={room?.answers?.[activeQuestion.id] ?? ""}
              onChange={(e) => updateAnswer(activeQuestion.id, e.target.value)}
              className={`mt-3 ${input}`}
              placeholder="Type customer answer"
            />
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={questionIndex === 0}
                onClick={() =>
                  void patchRoom({ questionIndex: Math.max(questionIndex - 1, 0) })
                }
                className={btnSecondaryCompact}
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={questionIndex >= KYC_QUESTIONS_CONFIG.length - 1}
                onClick={() =>
                  void patchRoom({
                    questionIndex: Math.min(questionIndex + 1, KYC_QUESTIONS_CONFIG.length - 1),
                  })
                }
                className={btnDark}
              >
                Next →
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={!questionsDone || otpSending}
            onClick={() => void goToOtp()}
            className={btnPrimaryBlock}
          >
            {otpSending
              ? "Sending OTP…"
              : questionsDone
                ? "Complete Step 2 → Send OTP"
                : "Type every question answer to continue"}
          </button>
        </section>
      ) : null}

      {stageIdx >= 3 ? (
        <section className={`space-y-3 ${card}`}>
          <h2 className="text-base font-bold text-slate-950">Step 3 — OTP</h2>
          {agentOtp ? (
            <p className="font-mono text-2xl font-bold tracking-widest text-slate-900">{agentOtp}</p>
          ) : (
            <button
              type="button"
              onClick={() => void goToOtp()}
              className={`w-full ${btnSecondary}`}
            >
              Resend OTP
            </button>
          )}
          <p className="text-sm text-slate-700">
            Customer status: {otpDone ? "Verified" : room?.otpSent ? "Waiting for entry" : "Not sent"}
          </p>
          <button
            type="button"
            disabled={!otpDone}
            onClick={completeVerification}
            className={btnPrimaryBlock}
          >
            {otpDone ? "Finish verification" : "Waiting for OTP…"}
          </button>
        </section>
      ) : null}

      <p className="pb-6 text-center text-xs text-slate-500">
        <Link href="/kyc" className="text-red-600 underline">
          Customer view
        </Link>
      </p>
    </main>
  );
}
