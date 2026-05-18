"use client";

import { useRef } from "react";

type OtpInputProps = {
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
};

export function OTPInput({ value, error, onChange }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const setDigit = (index: number, digit: string) => {
    const next = value.padEnd(6, " ").split("");
    next[index] = digit.replace(/\D/g, "").slice(-1);
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <div>
      <div className={`grid grid-cols-6 gap-2 ${error ? "animate-[shake_0.2s_ease-in-out_2]" : ""}`}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node;
            }}
            aria-label={`OTP digit ${index + 1}`}
            inputMode="numeric"
            maxLength={1}
            value={digit.trim()}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digit.trim() && index > 0) {
                inputsRef.current[index - 1]?.focus();
              }
            }}
            className="h-12 rounded-lg border border-slate-300 text-center text-lg font-bold text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
