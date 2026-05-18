"use client";

import Link from "next/link";
import { useGa } from "@/hooks/useGa";

export default function AboutPage() {
  const { trackEvent } = useGa();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">About</h1>
      <p className="text-zinc-600">
        This page exists to validate page view tracking in GA4 and session replay
        in Clarity.
      </p>
      <button
        className="w-fit rounded bg-black px-4 py-2 text-white"
        onClick={() =>
          trackEvent("about_interaction", {
            source: "about_page",
            action: "learn_more_click",
          })
        }
      >
        Track About Interaction
      </button>
      <Link className="underline" href="/">
        Go back home
      </Link>
    </main>
  );
}
