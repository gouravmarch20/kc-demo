import type { ReactNode } from "react";
import { Stepper } from "@/components/kyc/stepper";
import type { KycStep } from "@/lib/kyc/types";

type KycShellProps = {
  step: KycStep;
  title: string;
  subtitle?: string;
  roomId?: string;
  liveConnected?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

export function KycShell({
  step,
  title,
  subtitle,
  roomId,
  liveConnected,
  children,
  footer,
}: KycShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
              Max Life Insurance
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <div className="text-right text-xs text-slate-500">
            {roomId ? (
              <p className="font-mono">
                Room <span className="text-slate-950">{roomId.slice(0, 8)}...</span>
              </p>
            ) : null}
            {liveConnected !== undefined ? (
              <p className="mt-1 flex items-center justify-end gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${liveConnected ? "bg-emerald-400" : "bg-amber-400"}`}
                />
                {liveConnected ? "Live sync on" : "Connecting…"}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6">
          <Stepper currentStep={step} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
      {footer}
    </div>
  );
}
