declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export type GaEventParams = Record<string, string | number | boolean>;

export function sendGaEvent(eventName: string, params: GaEventParams = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function sendGaPageView(url: string): void {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (
    typeof window === "undefined" ||
    typeof window.gtag !== "function" ||
    !measurementId
  ) {
    return;
  }

  window.gtag("config", measurementId, {
    page_path: url,
  });
}
