export type KycStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type KycRole = "customer" | "agent";

export type KycAssistedStage = "video" | "photo" | "questions" | "otp" | "complete";

export type PreJourneyAnswers = {
  existingCustomer: "yes" | "no" | "";
  validIdProof: "yes" | "no" | "";
  above18: "yes" | "no" | "";
};

export type KycQuestionAnswers = {
  fullName: string;
  dob: string;
  city: string;
};

export type KycMediaState = {
  photoDataUrl: string | null;
  photoUrl: string | null;
};

export type DeviceCheckState = {
  camera: boolean;
  microphone: boolean;
  checkedAt: number | null;
  error: string | null;
};

export type KycJourneyState = {
  currentStep: KycStep;
  policyNumber: string;
  roomId: string;
  roomSecret: string;
  consentAccepted: boolean;
  preJourneyAnswers: PreJourneyAnswers;
  questionnaire: KycQuestionAnswers;
  deviceCheck: DeviceCheckState;
  media: KycMediaState;
  otpVerified: boolean;
  finalSubmitted: boolean;
};

export type KycRoomState = {
  roomId: string;
  /** Server-only; never sent over SSE or public GET */
  roomSecret?: string;
  customerName: string;
  policyId: string;
  step: KycStep;
  questionIndex: number;
  customerPhoto: string | null;
  answers: Record<string, string>;
  otpSent: boolean;
  otpVerified: boolean;
  agentEvent: string;
  assistedStage: KycAssistedStage;
  localVideoRotation: number;
  remoteVideoRotation: number;
  agentFocusMode: boolean;
  callConnected: boolean;
  acsFailed: boolean;
  acsErrorMessage: string | null;
  status: "in_progress" | "completed";
  updatedAt: number;
  updatedBy: KycRole;
};

export const defaultKycRoomState: KycRoomState = {
  roomId: "",
  customerName: "",
  policyId: "",
  step: 1,
  questionIndex: 0,
  customerPhoto: null,
  answers: {},
  otpSent: false,
  otpVerified: false,
  agentEvent: "Step 0: Join the video call to connect with your agent.",
  assistedStage: "video",
  callConnected: false,
  acsFailed: false,
  acsErrorMessage: null,
  localVideoRotation: 0,
  remoteVideoRotation: 0,
  agentFocusMode: false,
  status: "in_progress",
  updatedAt: 0,
  updatedBy: "customer",
};

export type KycSession = {
  customerName: string;
  policyId: string;
  roomId: string;
  acceptedTerms: boolean;
};

export const defaultKycSession: KycSession = {
  customerName: "",
  policyId: "",
  roomId: "",
  acceptedTerms: false,
};
