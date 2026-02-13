/**
 * Shared types for onboarding components
 */

export interface OnboardingData {
  organizationName: string;
  organizationType: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  projectName: string;
  projectDescription: string;
  serviceCategory: string;
  projectType: string;
  serviceTier: string;
  ensembleType: string;
  ensembleSize: number;
  ageGroup: string;
  startDate: string;
  deadline: string;
  timeline: string;
  budgetRange: string;
  isFlexibleBudget: boolean;
  specificRequirements: string;
  hasExistingDesigns: boolean;
  designReferences: string[];
  communicationPreferences: string[];
  additionalServices: string[];
  paymentTiming: string;
  agreedToTerms: boolean;
}
