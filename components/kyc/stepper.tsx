import { KYC_STEPS } from "@/lib/kyc/constants";
import type { KycStep } from "@/lib/kyc/types";

type StepperProps = {
  currentStep: KycStep;
};

export function Stepper({ currentStep }: StepperProps) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
      {KYC_STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;

        return (
          <li
            key={step.id}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              isActive
                ? "border-red-500 bg-red-50 text-red-700"
                : isDone
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span className="block text-[10px] uppercase tracking-wide">Step {step.id}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
