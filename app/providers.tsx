"use client";

// Load the real Provider tree (react-redux + redux-persist's PersistGate)
// client-only. PersistGate triggers `Cannot read properties of null (reading
// 'useContext')` during server prerender of Next.js's internal /_global-error
// page in React 19 + Next 16. Skipping SSR here sidesteps the whole module
// graph server-side. Children are still rendered, just hydrated after the
// client bundle loads.

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const ProvidersClient = dynamic(() => import("./providers-client"), {
  ssr: false,
  loading: () => null,
});

export function Providers({ children }: { children: ReactNode }) {
  return <ProvidersClient>{children}</ProvidersClient>;
}
