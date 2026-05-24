"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  KycJourneyState,
  KycMediaState,
  KycQuestionAnswers,
  KycStep,
  PreJourneyAnswers,
  DeviceCheckState,
} from "@/lib/kyc/types";

export const initialKycJourneyState: KycJourneyState = {
  currentStep: 1,
  policyNumber: "",
  roomId: "",
  roomSecret: "",
  consentAccepted: false,
  preJourneyAnswers: {
    existingCustomer: "",
    validIdProof: "",
    above18: "",
  },
  questionnaire: {
    fullName: "",
    dob: "",
    city: "",
  },
  deviceCheck: {
    camera: false,
    microphone: false,
    checkedAt: null,
    error: null,
  },
  media: {
    photoDataUrl: null,
    photoUrl: null,
    recordings: {
      customerVideoUrl: null,
      customerVideoOnlyUrl: null,
      agentVideoUrl: null,
      combinedVideoUrl: null,
      fullVideoUrl: null,
      customerMicAudioUrl: null,
      customerAudioUrl: null,
      mixedAudioUrl: null,
      agentAudioUrl: null,
      recordedAt: null,
    },
  },
  otpVerified: false,
  finalSubmitted: false,
};

const kycSlice = createSlice({
  name: "kyc",
  initialState: initialKycJourneyState,
  reducers: {
    setCurrentStep(state, action: PayloadAction<KycStep>) {
      state.currentStep = action.payload;
    },
    setRoomId(state, action: PayloadAction<string>) {
      state.roomId = action.payload;
    },
    setRoomSecret(state, action: PayloadAction<string>) {
      state.roomSecret = action.payload;
    },
    setPolicyNumber(state, action: PayloadAction<string>) {
      state.policyNumber = action.payload;
    },
    setConsentAccepted(state, action: PayloadAction<boolean>) {
      state.consentAccepted = action.payload;
    },
    setPreJourneyAnswer(
      state,
      action: PayloadAction<{ key: keyof PreJourneyAnswers; value: "yes" | "no" }>,
    ) {
      state.preJourneyAnswers[action.payload.key] = action.payload.value;
    },
    setQuestionAnswer(
      state,
      action: PayloadAction<{ key: keyof KycQuestionAnswers; value: string }>,
    ) {
      state.questionnaire[action.payload.key] = action.payload.value;
    },
    setDeviceCheck(state, action: PayloadAction<DeviceCheckState>) {
      state.deviceCheck = action.payload;
    },
    setMedia(state, action: PayloadAction<Partial<KycMediaState>>) {
      state.media = { ...state.media, ...action.payload };
    },
    setOtpVerified(state, action: PayloadAction<boolean>) {
      state.otpVerified = action.payload;
    },
    setFinalSubmitted(state, action: PayloadAction<boolean>) {
      state.finalSubmitted = action.payload;
    },
    resetJourney() {
      return initialKycJourneyState;
    },
  },
});

export const {
  resetJourney,
  setConsentAccepted,
  setCurrentStep,
  setDeviceCheck,
  setFinalSubmitted,
  setMedia,
  setOtpVerified,
  setPreJourneyAnswer,
  setQuestionAnswer,
  setRoomId,
  setRoomSecret,
  setPolicyNumber,
} = kycSlice.actions;

export const kycReducer = kycSlice.reducer;
