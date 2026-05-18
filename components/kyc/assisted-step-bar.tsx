"use client";

import { ASSISTED_STEP_LABELS, stageIndex } from "@/lib/kyc/assisted-steps";
import type { KycAssistedStage } from "@/lib/kyc/types";

type AssistedStepBarProps = {
  activeStage: KycAssistedStage;
};

export function AssistedStepBar({ activeStage }: AssistedStepBarProps) {
  const activeIdx = stageIndex(activeStage);

  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {ASSISTED_STEP_LABELS.map((step, index) => {
        const isActive = index === activeIdx;
        const isDone = index < activeIdx || activeStage === "complete";

        return (
          <li
            key={step.stage}
            className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-2 text-center text-xs font-semibold sm:px-3 sm:py-2.5 ${
              isActive
                ? "border-red-500 bg-red-50 text-red-700"
                : isDone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide">Step {step.short}</span>
            <span className="mt-0.5">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
