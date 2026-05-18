"use client";

import { useCallback } from "react";
import { sendGaEvent, type GaEventParams } from "@/lib/analytics/ga";

export function useGa() {
  const trackEvent = useCallback((eventName: string, params: GaEventParams = {}) => {
    sendGaEvent(eventName, params);
  }, []);

  return {
    trackEvent,
  };
}
