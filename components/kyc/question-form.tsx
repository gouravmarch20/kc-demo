"use client";

import { KYC_QUESTIONS_CONFIG } from "@/lib/kyc/constants";
import type { KycQuestionAnswers, PreJourneyAnswers } from "@/lib/kyc/types";

type PreJourneyFormProps = {
  answers: PreJourneyAnswers;
  onAnswer: (key: keyof PreJourneyAnswers, value: "yes" | "no") => void;
};

type KycQuestionFormProps = {
  answers: KycQuestionAnswers;
  onAnswer: (key: keyof KycQuestionAnswers, value: string) => void;
};

const PRE_JOURNEY_QUESTIONS: Array<{
  key: keyof PreJourneyAnswers;
  label: string;
  blocker: "yes" | "no";
}> = [
  { key: "existingCustomer", label: "Are you existing customer?", blocker: "no" },
  { key: "validIdProof", label: "Do you have valid ID proof?", blocker: "no" },
  { key: "above18", label: "Are you above 18 years old?", blocker: "no" },
];

export function PreJourneyForm({ answers, onAnswer }: PreJourneyFormProps) {
  return (
    <div className="space-y-4">
      {PRE_JOURNEY_QUESTIONS.map((question) => {
        const blocked = answers[question.key] === question.blocker;

        return (
          <fieldset key={question.key} className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-900">{question.label}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["yes", "no"] as const).map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
                    answers[question.key] === value
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.key}
                    checked={answers[question.key] === value}
                    onChange={() => onAnswer(question.key, value)}
                  />
                  {value === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
            {blocked ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                This answer blocks assisted digital KYC continuation for the demo journey.
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

export function KycQuestionForm({ answers, onAnswer }: KycQuestionFormProps) {
  const errors = {
    fullName:
      answers.fullName && !/^[a-zA-Z ]{2,}$/.test(answers.fullName)
        ? "Use letters and spaces only."
        : "",
    dob:
      answers.dob && !/^\d{2}\/\d{2}\/\d{4}$/.test(answers.dob)
        ? "Use DD/MM/YYYY format."
        : "",
    city: answers.city && answers.city.length < 2 ? "Enter a valid city." : "",
  };

  return (
    <div className="grid gap-4">
      {KYC_QUESTIONS_CONFIG.map((question) => {
        const key = question.id as keyof KycQuestionAnswers;

        return (
          <label key={question.id} className="block">
            <span className="text-sm font-semibold text-slate-900">{question.label}</span>
            <input
              value={answers[key]}
              onChange={(event) => onAnswer(key, event.target.value)}
              placeholder={question.placeholder}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            {errors[key] ? <span className="mt-1 block text-sm text-red-600">{errors[key]}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
