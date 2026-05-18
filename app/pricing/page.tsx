"use client";

import Link from "next/link";
import { useGa } from "@/hooks/useGa";

export default function PricingPage() {
  const { trackEvent } = useGa();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-20">
      <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
      <p className="text-zinc-600">
        Trigger checkout-style events from here to test conversions in GA4.
      </p>
      <button
        className="w-fit rounded bg-black px-4 py-2 text-white"
        onClick={() =>
          trackEvent("begin_checkout", {
            source: "pricing_page",
            plan: "pro",
          })
        }
      >
        Track Begin Checkout
      </button>
      <Link className="underline" href="/">
        Go back home
      </Link>
    </main>
  );
}
