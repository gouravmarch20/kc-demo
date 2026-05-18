"use client";

import Link from "next/link";
import { useGa } from "@/hooks/useGa";

export default function Home() {
  const { trackEvent } = useGa();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-20">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Analytics Demo</h1>
        <p className="text-zinc-600">
          GA4 and Microsoft Clarity are wired globally. Use the links and buttons
          below to generate activity events.
        </p>
      </header>

      <nav className="flex flex-wrap gap-4">
        <Link className="underline" href="/kyc">
          Professional Video KYC (8 steps)
        </Link>
        <Link className="underline" href="/kyc/agent">
          KYC Agent portal
        </Link>
        <Link className="underline" href="/about">
          About
        </Link>
        <Link className="underline" href="/pricing">
          Pricing
        </Link>
      </nav>

      <div className="flex gap-4">
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={() =>
            trackEvent("cta_click", {
              source: "home",
              label: "start_trial",
            })
          }
        >
          Track CTA Click
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() =>
            trackEvent("video_play", {
              source: "home",
              percent: 25,
            })
          }
        >
          Track Video Event
        </button>
      </div>
    </main>
  );
}
