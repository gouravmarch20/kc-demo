"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AcsFailedBanner } from "@/components/kyc/acs-failed-banner";
import { KycShell } from "@/components/kyc/kyc-shell";
import { OTPInput } from "@/components/kyc/otp-input";
import { PreJourneyForm } from "@/components/kyc/question-form";
import { AssistedStepBar } from "@/components/kyc/assisted-step-bar";
import {
  VideoCallPanel,
  type AcsCallStatePayload,
  type VideoCallPanelHandle,
} from "@/components/kyc/video-call-panel";
import { DUMMY_POLICY_CONTENT, KYC_QUESTIONS_CONFIG } from "@/lib/kyc/constants";
import { isQuestionsComplete } from "@/lib/kyc/assisted-steps";
import { generatePolicyNumber } from "@/lib/kyc/policy";
import type { KycRecordingState, KycStep } from "@/lib/kyc/types";
import {
  btnPrimary,
  btnPrimaryBlock,
  btnSecondary,
  inputDisplay,
  noticeInfo,
  noticeSuccess,
} from "@/lib/ui/styles";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { selectKycJourney } from "@/lib/store/selectors";
import {
  resetJourney,
  setConsentAccepted,
  setCurrentStep,
  setDeviceCheck,
  setFinalSubmitted,
  setOtpVerified,
  setPreJourneyAnswer,
  setRoomId,
  setRoomSecret,
  setPolicyNumber,
  setMedia,
} from "@/lib/store/kyc-slice";
import { useKycRoom } from "@/hooks/useKycRoom";

function NavFooter({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6">
      {showBack && onBack ? (
        <button type="button" onClick={onBack} className={btnSecondary}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button type="button" disabled={nextDisabled} onClick={onNext} className={btnPrimary}>
        {nextLabel}
      </button>
    </div>
  );
}

const goTo = (dispatch: ReturnType<typeof useAppDispatch>, step: KycStep) => {
  dispatch(setCurrentStep(step));
};

function RecordingPreviewCard({
  title,
  description,
  src,
  type,
  unavailableLabel,
}: {
  title: string;
  description: string;
  src: string | null;
  type: "video" | "audio";
  unavailableLabel?: string;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {src ? (
        type === "video" ? (
          <video src={src} controls playsInline className="aspect-video w-full rounded-lg bg-slate-950 object-contain" />
        ) : (
          <audio src={src} controls className="w-full" />
        )
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {unavailableLabel ?? "Not recorded yet. Go back to step 6 and save a preview recording."}
        </p>
      )}
    </section>
  );
}

export function KycWizard() {
  const dispatch = useAppDispatch();
  const journey = useAppSelector(selectKycJourney);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deviceChecking, setDeviceChecking] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const videoPanelRef = useRef<VideoCallPanelHandle>(null);

  const roomId = journey.roomId;
  const { room, connected, patchRoom, verifyOtp: verifyOtpApi } = useKycRoom(
    roomId,
    "customer",
    journey.roomSecret,
  );
  const deviceCheck = journey.deviceCheck ?? {
    camera: false,
    microphone: false,
    checkedAt: null,
    error: null,
  };

  const preJourneyComplete = Object.values(journey.preJourneyAnswers).every(Boolean);
  const preJourneyEligible =
    journey.preJourneyAnswers.existingCustomer === "yes" &&
    journey.preJourneyAnswers.validIdProof === "yes" &&
    journey.preJourneyAnswers.above18 === "yes";
  const roomAnswers = room?.answers ?? {};
  const questionnaireComplete = isQuestionsComplete(room);
  const activeQuestion =
    KYC_QUESTIONS_CONFIG[room?.questionIndex ?? 0] ?? KYC_QUESTIONS_CONFIG[0];
  useEffect(() => {
    if (journey.currentStep === 1 && !journey.policyNumber.trim()) {
      dispatch(setPolicyNumber(generatePolicyNumber()));
    }
  }, [dispatch, journey.currentStep, journey.policyNumber]);

  const checklist = useMemo(
    () => [
      { label: "Photo captured", done: Boolean(room?.customerPhoto) },
      { label: "Questions answered", done: questionnaireComplete },
      { label: "OTP verified", done: journey.otpVerified || Boolean(room?.otpVerified) },
    ],
    [journey.otpVerified, questionnaireComplete, room?.customerPhoto, room?.otpVerified],
  );

  const ensureRoom = async () => {
    setRoomError(null);
    const nextRoomId = roomId || crypto.randomUUID();
    if (!roomId) {
      dispatch(setRoomId(nextRoomId));
    }

    const createRoom = async (id: string) => {
      const response = await fetch(`/api/kyc/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialize: true,
          customerName: journey.questionnaire.fullName || "KYC Customer",
          policyId: journey.policyNumber || "life-shield-24",
          step: 6,
          assistedStage: "video",
          agentEvent: "Step 0: Join video with your agent first.",
          updatedBy: "customer",
        }),
      });
      const payload = (await response.json()) as { roomSecret?: string; error?: string };
      return { response, payload };
    };

    let { response, payload } = await createRoom(nextRoomId);

    if (response.status === 403) {
      const freshRoomId = crypto.randomUUID();
      dispatch(setRoomId(freshRoomId));
      dispatch(setRoomSecret(""));
      ({ response, payload } = await createRoom(freshRoomId));
    }

    if (!response.ok) {
      setRoomError(payload.error ?? "Could not create KYC room. Please try again.");
      return;
    }
    if (payload.roomSecret) {
      dispatch(setRoomSecret(payload.roomSecret));
    }
    dispatch(setCurrentStep(6));
  };

  const runDeviceCheck = async () => {
    setDeviceChecking(true);
    try {
      // Major section: pre-call device permission check before assisted KYC starts.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const camera = stream.getVideoTracks().length > 0;
      const microphone = stream.getAudioTracks().length > 0;
      stream.getTracks().forEach((track) => track.stop());

      dispatch(
        setDeviceCheck({
          camera,
          microphone,
          checkedAt: Date.now(),
          error: camera && microphone ? null : "Camera or microphone not detected.",
        }),
      );
    } catch {
      dispatch(
        setDeviceCheck({
          camera: false,
          microphone: false,
          checkedAt: Date.now(),
          error: "Camera or microphone permission was blocked. Please allow access and retry.",
        }),
      );
    } finally {
      setDeviceChecking(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!room?.otpSent) {
      setOtpError("Waiting for agent to send OTP.");
      return;
    }
    const result = await verifyOtpApi(otp);
    if (!result.ok) {
      setOtpError(result.error ?? "Invalid or expired OTP.");
      return;
    }
    setOtpError(null);
    await videoPanelRef.current?.stopRecording();
    dispatch(setOtpVerified(true));
    if (roomId) {
      await patchRoom({
        assistedStage: "complete",
        agentEvent: "Verification completed",
      });
    }
    dispatch(setCurrentStep(7));
  };

  const handleCallStateChange = useCallback(
    (state: AcsCallStatePayload) => {
      if (!roomId) return;
      void patchRoom({
        callConnected: state.callConnected,
        acsFailed: state.acsFailed,
        acsErrorMessage: state.error,
        ...(state.acsFailed
          ? { agentEvent: "ACS connection failed. Tap Join video again." }
          : state.callConnected
            ? { agentEvent: "Connected on video with agent." }
            : {}),
      });
    },
    [patchRoom, roomId],
  );

  const handleRecordingReady = useCallback(
    (recordings: KycRecordingState) => {
      dispatch(setMedia({ recordings }));
    },
    [dispatch],
  );

  const submitFinalKyc = async () => {
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const response = await fetch("/api/submit-kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journey),
      });
      const payload = (await response.json()) as { referenceId?: string };
      dispatch(setFinalSubmitted(true));
      setSubmitMessage(`Final KYC submitted. Reference ${payload.referenceId}.`);
    } catch {
      setSubmitMessage("Final submit failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (journey.currentStep === 1) {
    return (
      <KycShell
        step={1}
        title="Secure Video KYC Journey"
        subtitle="A production-style assisted KYC proof of concept for Max Life Insurance."
      >
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <div className="rounded-lg border border-red-100 bg-red-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
                Estimated time: 5-7 minutes
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Agent assisted. Customer guided. Enterprise ready.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This journey captures consent, eligibility, media, questionnaire responses, OTP
                verification, and a final compliance summary.
              </p>
            </div>
          </section>

          <section className="grid gap-3">
            {["Live video call with agent", "Agent-driven photo capture", "Guided questionnaire", "OTP verification"].map(
              (item) => (
                <div key={item} className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ),
            )}
          </section>
        </div>
        <label className="mt-6 block rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
          <span className="text-sm font-semibold text-slate-900">Policy number</span>
          <p className="mt-1 text-xs text-slate-500">
            A unique policy number is generated for each journey. Confirm or edit before continuing.
          </p>
          <input
            type="text"
            value={journey.policyNumber}
            onChange={(event) => dispatch(setPolicyNumber(event.target.value.trim()))}
            className={`mt-3 ${inputDisplay}`}
            placeholder="MLI-2026-000000"
          />
        </label>
        <NavFooter
          showBack={false}
          nextLabel="Start KYC Journey"
          onNext={() => goTo(dispatch, 2)}
          nextDisabled={!journey.policyNumber.trim()}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 2) {
    return (
      <KycShell step={2} title="Before You Begin" subtitle="Keep the session ready for smooth assisted verification.">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Keep PAN or Aadhaar ready",
            "Allow camera and microphone permissions",
            "Ensure proper lighting",
            "Use a stable internet connection",
          ].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
              {item}
            </div>
          ))}
        </div>
        <label className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={instructionsAccepted}
            onChange={(event) => setInstructionsAccepted(event.target.checked)}
          />
          I understand
        </label>
        <NavFooter
          onBack={() => goTo(dispatch, 1)}
          onNext={() => goTo(dispatch, 3)}
          nextDisabled={!instructionsAccepted}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 3) {
    return (
      <KycShell step={3} title="Policy Information and Consent" subtitle="Review the policy and provide consent.">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dummy policy content</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{DUMMY_POLICY_CONTENT.productName}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Policy Number</dt>
                <dd className="font-semibold text-slate-900">{journey.policyNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Premium</dt>
                <dd className="font-semibold text-slate-900">{DUMMY_POLICY_CONTENT.premium}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Sum Assured</dt>
                <dd className="font-semibold text-slate-900">{DUMMY_POLICY_CONTENT.sumAssured}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-slate-200 p-5 text-sm leading-6 text-slate-700">
            <h3 className="font-bold text-slate-950">Data consent and KYC declaration</h3>
            <p className="mt-3">{DUMMY_POLICY_CONTENT.legalText}</p>
            <p className="mt-3">
              I consent to data processing, audio/video recording, identity checks, and compliance
              review for this assisted KYC journey.
            </p>
          </section>
        </div>
        <label className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={journey.consentAccepted}
            onChange={(event) => dispatch(setConsentAccepted(event.target.checked))}
          />
          I agree to continue
        </label>
        <NavFooter
          onBack={() => goTo(dispatch, 2)}
          onNext={() => goTo(dispatch, 4)}
          nextDisabled={!journey.consentAccepted}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 4) {
    return (
      <KycShell step={4} title="Pre Journey Questions" subtitle="Eligibility answers are persisted locally through Redux Persist.">
        <PreJourneyForm
          answers={journey.preJourneyAnswers}
          onAnswer={(key, value) => dispatch(setPreJourneyAnswer({ key, value }))}
        />
        {!preJourneyEligible && preJourneyComplete ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800">
            One or more answers block eligibility. Continue is disabled for this demo.
          </p>
        ) : null}
        <NavFooter
          onBack={() => goTo(dispatch, 3)}
          onNext={() => goTo(dispatch, 5)}
          nextDisabled={!preJourneyComplete || !preJourneyEligible}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 5) {
    const deviceReady = deviceCheck.camera && deviceCheck.microphone;

    return (
      <KycShell
        step={5}
        title="Device Check"
        subtitle="Camera and microphone permissions are required before connecting with the agent."
      >
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Permission test
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Check camera and microphone
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This page briefly requests camera and microphone access, confirms both devices are
              available, and then releases the test stream before the live KYC room starts.
            </p>
            <button
              type="button"
              disabled={deviceChecking}
              onClick={() => void runDeviceCheck()}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deviceChecking ? "Checking devices..." : "Run Device Check"}
            </button>
          </section>

          <section className="grid gap-3">
            {[
              ["Camera permission", deviceCheck.camera],
              ["Microphone permission", deviceCheck.microphone],
            ].map(([label, done]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <span className="font-semibold text-slate-800">{label}</span>
                <span className={done ? "text-emerald-600" : "text-slate-400"}>
                  {done ? "Ready" : "Pending"}
                </span>
              </div>
            ))}
            {deviceCheck.checkedAt ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Last checked: {new Date(deviceCheck.checkedAt).toLocaleString()}
              </p>
            ) : null}
            {deviceCheck.error ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">
                {deviceCheck.error}
              </p>
            ) : null}
            {roomError ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{roomError}</p>
            ) : null}
          </section>
        </div>
        <NavFooter
          onBack={() => goTo(dispatch, 4)}
          onNext={() => void ensureRoom()}
          nextLabel="Connect to Agent"
          nextDisabled={!deviceReady}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 6) {
    const assistedStage = room?.assistedStage ?? "video";
    const agentUrl =
      roomId && journey.roomSecret
        ? `/kyc/agent?room=${roomId}&token=${encodeURIComponent(journey.roomSecret)}`
        : roomId
          ? `/kyc/agent?room=${roomId}`
          : "/kyc/agent";

    return (
      <KycShell
        step={6}
        title="Live verification"
        subtitle="One step at a time. Your agent will guide you."
        roomId={roomId}
        liveConnected={connected}
      >
        <div className="mx-auto max-w-lg space-y-4">
          <AssistedStepBar activeStage={assistedStage} />

          {room?.acsFailed ? <AcsFailedBanner message={room.acsErrorMessage} /> : null}

          {roomId ? (
            <VideoCallPanel
              ref={videoPanelRef}
              roomId={roomId}
              displayName="KYC Customer"
              role="customer"
              variant="customer-focus"
              onCallStateChange={handleCallStateChange}
              recordingMode="customer-step-6"
              onRecordingReady={handleRecordingReady}
            />
          ) : null}

          <p className={noticeInfo}>
            {room?.agentEvent ?? "Waiting for agent…"}
          </p>

          {assistedStage === "video" ? (
            <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-bold text-slate-950">Step 0 — Connect with agent</h2>
              <p className="text-sm text-slate-600">
                Tap <strong>Join video</strong> above. Stay on the call — the agent will guide every step.
              </p>
              {room?.callConnected && !room?.acsFailed ? (
                <p className={noticeSuccess}>On video with agent. Please wait.</p>
              ) : null}
            </section>
          ) : null}

          {assistedStage === "photo" ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-bold text-slate-950">Step 1 — Photo</h2>
              <p className="text-sm text-slate-600">
                Look straight at the camera and hold still. The agent will capture your photo from the
                video call.
              </p>
              {room?.customerPhoto ? (
                <div className="overflow-hidden rounded-lg border border-emerald-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={room.customerPhoto} alt="Your captured photo" className="h-44 w-full object-cover" />
                  <p className="bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    Photo captured by agent.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Waiting for agent to capture your photo…
                </p>
              )}
            </section>
          ) : null}

          {assistedStage === "questions" ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-bold text-slate-950">Step 2 — Questionnaire</h2>
              <p className="text-sm text-slate-600">
                Answer each question out loud on the call. Your agent is typing your reply.
              </p>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Question {(room?.questionIndex ?? 0) + 1} of {KYC_QUESTIONS_CONFIG.length}
                </p>
                <p className="mt-2 text-base font-bold text-slate-950">{activeQuestion.label}</p>
                {roomAnswers[activeQuestion.id] ? (
                  <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Agent recorded: {roomAnswers[activeQuestion.id]}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-amber-700">
                    Answer on the call — your agent is typing your reply.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {assistedStage === "otp" || assistedStage === "complete" ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-base font-bold text-slate-950">Step 3 — OTP</h2>
              <p className="text-sm text-slate-600">
                Enter the one-time password sent to your registered mobile number.
              </p>
              <OTPInput value={otp} error={otpError} onChange={setOtp} />
              <button
                type="button"
                disabled={!room?.otpSent || otp.length !== 6 || assistedStage === "complete"}
                onClick={() => void handleVerifyOtp()}
                className={btnPrimaryBlock}
              >
                Verify OTP
              </button>
            </section>
          ) : null}

          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-slate-700">Agent join link</summary>
            <p className="mt-2 break-all font-mono text-xs text-slate-600">
              {typeof window === "undefined" ? agentUrl : `${window.location.origin}${agentUrl}`}
            </p>
            <Link className="mt-2 inline-block font-semibold text-red-600 underline" href={agentUrl} target="_blank">
              Open agent console
            </Link>
          </details>
        </div>

        <NavFooter
          onBack={() => goTo(dispatch, 5)}
          onNext={() => goTo(dispatch, 7)}
          nextLabel="Review recordings"
          nextDisabled={!journey.otpVerified && !room?.otpVerified}
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 7) {
    const recordings = journey.media.recordings;
    const hasBrowserRecordings =
      recordings.customerVideoOnlyUrl ||
      recordings.customerVideoUrl ||
      recordings.agentVideoUrl ||
      recordings.combinedVideoUrl ||
      recordings.fullVideoUrl ||
      recordings.agentAudioUrl ||
      recordings.customerMicAudioUrl ||
      recordings.customerAudioUrl ||
      recordings.mixedAudioUrl;

    return (
      <KycShell
        step={7}
        title="Conversation Preview"
        subtitle="Review the step 6 media captured in this browser before final submission."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <h2 className="text-base font-bold text-sky-950">Step 6 recording review</h2>
            <p className="mt-2 text-sm leading-6 text-sky-800">
              Browser preview recordings are temporary and stay on this device. True agent-only
              audio and mixed call audio require Azure Communication Services server-side call
              recording.
            </p>
            {recordings.recordedAt ? (
              <p className="mt-2 text-xs font-semibold text-sky-900">
                Recorded {new Date(recordings.recordedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          {!hasBrowserRecordings ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800">
              No browser recording has been saved yet. You can go back to step 6, start recording,
              stop and save the preview, then return here.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <RecordingPreviewCard
              title="Agent video only"
              description="Silent video capture of the remote ACS agent tile."
              src={recordings.agentVideoUrl}
              type="video"
            />
            <RecordingPreviewCard
              title="Customer video only"
              description="Silent video capture of the customer's local camera preview."
              src={recordings.customerVideoOnlyUrl}
              type="video"
            />
            <RecordingPreviewCard
              title="Agent, customer full video"
              description="Side-by-side agent and customer video with the customer's microphone audio."
              src={recordings.fullVideoUrl}
              type="video"
            />
            <RecordingPreviewCard
              title="Agent audio only"
              description="Audio-only capture from the agent stream when the browser exposes it."
              src={recordings.agentAudioUrl}
              type="audio"
              unavailableLabel="Agent audio was not exposed by this browser/ACS tile."
            />
            <RecordingPreviewCard
              title="Agent + customer combined audio"
              description="Combined audio from any available agent audio track plus the customer's microphone."
              src={recordings.mixedAudioUrl}
              type="audio"
              unavailableLabel="Agent audio was not exposed by this browser/ACS tile; only customer audio may be available."
            />
            <RecordingPreviewCard
              title="Customer audio only"
              description="Audio-only recording of the customer's local microphone for download/review."
              src={recordings.customerAudioUrl}
              type="audio"
            />
          </div>
        </div>

        <NavFooter
          onBack={() => goTo(dispatch, 6)}
          onNext={() => goTo(dispatch, 8)}
          nextLabel="Continue to Summary"
        />
      </KycShell>
    );
  }

  if (journey.currentStep === 8) {
    return (
      <KycShell
        step={8}
        title="Verification Summary"
        subtitle="Confirm the journey checklist and submit."
      >
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-2xl font-bold text-emerald-900">Journey completed successfully</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Policy <span className="font-mono font-semibold">{journey.policyNumber}</span>
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
            >
              <span className="font-semibold text-slate-800">{item.label}</span>
              <span className={item.done ? "text-emerald-600" : "text-slate-400"}>
                {item.done ? "Complete" : "Pending"}
              </span>
            </div>
          ))}
        </div>
        {submitMessage ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{submitMessage}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-6">
          <button type="button" onClick={() => goTo(dispatch, 7)} className={btnSecondary}>
            Back
          </button>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => dispatch(resetJourney())}
              className={btnSecondary}
            >
              Restart Journey
            </button>
            <button
              type="button"
              disabled={submitting || checklist.some((item) => !item.done)}
              onClick={() => void submitFinalKyc()}
              className={btnPrimary}
            >
              {submitting ? "Submitting..." : "Submit Final KYC"}
            </button>
          </div>
        </div>
      </KycShell>
    );
  }

  return (
    <KycShell step={1} title="Secure Video KYC Journey" subtitle="Loading your session…">
      <p className="text-sm text-slate-600">
        Session state was reset.{" "}
        <button
          type="button"
          className="font-semibold text-red-600 underline"
          onClick={() => dispatch(resetJourney())}
        >
          Start a new journey
        </button>
      </p>
    </KycShell>
  );
}
