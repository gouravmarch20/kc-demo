export const KYC_STEPS = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Instructions" },
  { id: 3, label: "Policy" },
  { id: 4, label: "Questions" },
  { id: 5, label: "Device Check" },
  { id: 6, label: "KYC" },
  { id: 7, label: "Preview" },
  { id: 8, label: "Summary" },
] as const;

export type PolicyInfo = {
  id: string;
  title: string;
  summary: string;
  premium: string;
};

export const POLICIES: PolicyInfo[] = [
  {
    id: "life-shield-24",
    title: "Life Shield 24",
    summary: "Term life cover with nominee protection and accidental rider.",
    premium: "₹899 / month",
  },
  {
    id: "health-plus-gold",
    title: "Health Plus Gold",
    summary: "Family floater with cashless hospitalization across 500+ hospitals.",
    premium: "₹1,499 / month",
  },
  {
    id: "secure-retire",
    title: "Secure Retire",
    summary: "Retirement annuity with guaranteed maturity payout.",
    premium: "₹2,200 / month",
  },
];

export type PolicyQuestion = {
  id: string;
  label: string;
  helper?: string;
};

export const POLICY_QUESTIONS: Record<string, PolicyQuestion[]> = {
  "life-shield-24": [
    {
      id: "nominee_relation",
      label: "Who is your primary nominee and their relationship to you?",
      helper: "Required for life policies under IRDAI guidelines.",
    },
    {
      id: "existing_life_cover",
      label: "Do you hold any other active life insurance policy above ₹10L sum assured?",
    },
    {
      id: "declaration_accuracy",
      label: "Do you confirm all personal details shared today are accurate to the best of your knowledge?",
    },
  ],
  "health-plus-gold": [
    {
      id: "family_members",
      label: "List family members to be covered under this floater plan.",
    },
    {
      id: "pre_existing",
      label: "Any pre-existing condition declared in the last 24 months?",
    },
    {
      id: "hospital_preference",
      label: "Preferred city/region for cashless hospital network?",
    },
  ],
  "secure-retire": [
    {
      id: "retirement_age",
      label: "At what age do you plan to start receiving annuity payouts?",
    },
    {
      id: "monthly_contribution",
      label: "What monthly contribution are you comfortable committing for 10 years?",
    },
    {
      id: "payout_preference",
      label: "Preferred payout mode: monthly, quarterly, or annual?",
    },
  ],
};

export function getPolicyQuestions(policyId: string): PolicyQuestion[] {
  return POLICY_QUESTIONS[policyId] ?? POLICY_QUESTIONS["life-shield-24"];
}

export const DUMMY_POLICY_CONTENT = {
  policyNumber: "MLI-POC-2026-00042",
  productName: "Max Life Smart Secure Plus",
  premium: "₹1,250 / month",
  sumAssured: "₹50,00,000",
  legalText:
    "This proof of concept simulates policy verification, customer consent capture, and assisted digital KYC declaration for demo purposes only.",
};

export const KYC_QUESTIONS_CONFIG = [
  {
    id: "fullName",
    label: "What is your full name?",
    placeholder: "Enter name as per ID proof",
  },
  {
    id: "dob",
    label: "What is your DOB?",
    placeholder: "DD/MM/YYYY",
  },
  {
    id: "city",
    label: "What is your city?",
    placeholder: "Enter current city",
  },
] as const;
