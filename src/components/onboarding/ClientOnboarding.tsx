/**
 * ClientOnboarding - Main onboarding wizard
 * Refactored: steps extracted to OnboardingStep, progress to OnboardingProgress
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

import { OnboardingProgress, steps } from './OnboardingProgress';
import { OrganizationStep, ProjectStep, TimelineStep, RequirementsStep, ReviewStep } from './OnboardingStep';
import type { OnboardingData } from './onboardingTypes';

// Re-export for backward compatibility
export type { OnboardingData } from './onboardingTypes';

interface ClientOnboardingProps {
  onComplete?: (data: OnboardingData) => void;
  onCancel?: () => void;
  initialData?: Partial<OnboardingData>;
}

export function ClientOnboarding({ onComplete, onCancel, initialData }: ClientOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    organizationName: '', organizationType: '', location: '', contactEmail: '', contactPhone: '', website: '',
    projectName: '', projectDescription: '', serviceCategory: '', projectType: '', serviceTier: '',
    ensembleType: '', ensembleSize: 0, ageGroup: '',
    startDate: '', deadline: '', timeline: '', budgetRange: '', isFlexibleBudget: false,
    specificRequirements: '', hasExistingDesigns: false, designReferences: [], communicationPreferences: [], additionalServices: [],
    paymentTiming: '', agreedToTerms: false,
    ...initialData
  });

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => { if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1); };
  const prevStep = () => { if (currentStep > 0) setCurrentStep(prev => prev - 1); };
  const handleComplete = () => { if (onComplete) onComplete(formData); };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: return formData.organizationName && formData.organizationType && formData.contactEmail;
      case 1: return formData.projectName && formData.serviceCategory && formData.projectType && formData.serviceTier && formData.ensembleType;
      case 2: return formData.timeline && formData.budgetRange;
      case 3: return true;
      case 4: return formData.agreedToTerms;
      default: return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Flux Studio</h1>
          <p className="text-lg text-gray-600">Let's create something amazing together</p>
        </motion.div>

        <OnboardingProgress currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
          {currentStep === 0 && <OrganizationStep formData={formData} updateFormData={updateFormData} />}
          {currentStep === 1 && <ProjectStep formData={formData} updateFormData={updateFormData} />}
          {currentStep === 2 && <TimelineStep formData={formData} updateFormData={updateFormData} />}
          {currentStep === 3 && <RequirementsStep formData={formData} updateFormData={updateFormData} />}
          {currentStep === 4 && <ReviewStep formData={formData} updateFormData={updateFormData} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button variant="outline" onClick={currentStep === 0 ? onCancel : prevStep} className="min-w-[120px]">
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>
        <div className="text-center">
          <p className="text-sm text-gray-500">{steps[currentStep].description}</p>
        </div>
        <Button onClick={currentStep === steps.length - 1 ? handleComplete : nextStep} disabled={!isStepValid()} className="min-w-[120px]">
          {currentStep === steps.length - 1 ? 'Submit Request' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default ClientOnboarding;
