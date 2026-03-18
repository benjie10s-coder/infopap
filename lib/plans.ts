// lib/plans.ts — Subscription plan configuration

export type PlanType = "BASIC" | "GROWTH" | "SCALE";

export interface PlanConfig {
  type: PlanType;
  name: string;
  price: number; // KSh
  documentsLimit: number;
  perDocPrice: string; // Display string
  features: string[];
}

export const PLANS: PlanConfig[] = [
  {
    type: "BASIC",
    name: "Basic",
    price: 500,
    documentsLimit: 100,
    perDocPrice: "KSh 5",
    features: [
      "100 document downloads",
      "Valid for 1 year",
      "All document types",
      "Email sharing",
      "No watermarks",
    ],
  },
  {
    type: "GROWTH",
    name: "Growth",
    price: 1500,
    documentsLimit: 300,
    perDocPrice: "KSh 5",
    features: [
      "300 document downloads",
      "Valid for 1 year",
      "All document types",
      "Email sharing",
      "No watermarks",
      "Priority support",
    ],
  },
  {
    type: "SCALE",
    name: "Scale",
    price: 3000,
    documentsLimit: 700,
    perDocPrice: "~KSh 4.3",
    features: [
      "700 document downloads",
      "Valid for 1 year",
      "All document types",
      "Email sharing",
      "No watermarks",
      "Priority support",
    ],
  },
];

export const PAY_AS_YOU_GO = {
  name: "Pay As You Go",
  price: 10,
  perDocPrice: "KSh 10",
  features: [
    "Pay per document",
    "No commitment",
    "All document types",
    "Email sharing",
    "No watermarks",
  ],
};

export function getPlanByType(type: string): PlanConfig | undefined {
  return PLANS.find((p) => p.type === type);
}
