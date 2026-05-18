"use client";

import dynamic from "next/dynamic";

const KycWizard = dynamic(
  () => import("@/components/kyc/kyc-wizard").then((mod) => mod.KycWizard),
  {
    ssr: false,
    loading: () => (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6 py-20">
        <p className="text-sm text-zinc-500">Loading KYC flow…</p>
      </main>
    ),
  },
);

export function KycWizardLoader() {
  return <KycWizard />;
}
