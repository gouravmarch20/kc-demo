import createTransform from "redux-persist/es/createTransform";
import type { KycJourneyState } from "@/lib/kyc/types";

/** Avoid persisting large base64 photo blobs to localStorage. */
export const kycPersistTransform = createTransform<KycJourneyState, KycJourneyState>(
  (inbound) => ({
    ...inbound,
    roomId: "",
    roomSecret: "",
    media: {
      ...inbound.media,
      photoDataUrl: null,
    },
  }),
  (outbound) => outbound,
);
