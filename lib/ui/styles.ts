/**
 * Shared Tailwind class variables for the KYC UI. Keep visual tokens in one place
 * so the journey looks consistent and is easy to re-skin.
 */

// --- Buttons -----------------------------------------------------------------

/** Solid primary CTA (Max Life red). */
export const btnPrimary =
  "rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

/** Full-width primary CTA used inside cards. */
export const btnPrimaryBlock =
  "w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

/** Light secondary button (Back / Cancel / Restart). */
export const btnSecondary =
  "rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

/** Compact secondary button (Previous, dialog actions). */
export const btnSecondaryCompact =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";

/** Dark slate accent button (Next, neutral progression). */
export const btnDark =
  "rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

// --- Inputs ------------------------------------------------------------------

/** Standard text input. */
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm";

/** Monospace input (codes / IDs). */
export const inputMono =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm";

/** Highlighted policy / large display input. */
export const inputDisplay =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-base font-semibold tracking-wide text-slate-900 shadow-sm";

// --- Cards -------------------------------------------------------------------

/** Default content card. */
export const card =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

/** Soft gradient card (used to highlight a single grouped section). */
export const cardSoft =
  "rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm";

/** Subtle inner panel inside a card. */
export const panel =
  "rounded-lg border border-slate-200 bg-slate-50 p-4";

// --- Pills / badges ----------------------------------------------------------

export const pillBrand =
  "rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700";

export const pillSuccess =
  "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800";

export const pillWarning =
  "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900";

// --- Status banners ----------------------------------------------------------

export const noticeInfo =
  "rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-900";

export const noticeSuccess =
  "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800";

export const noticeWarning =
  "rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800";

export const noticeError =
  "rounded-lg bg-red-50 p-3 text-sm text-red-800";

// --- Helper ------------------------------------------------------------------

/** Concatenate class names while filtering falsy values. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
