import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Star,
  Calendar,
  DollarSign,
  Users,
  Music,
  Palette,
  FileText,
  MessageSquare,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { SERVICE_OFFERINGS, PROJECT_TYPE_DETAILS, SERVICE_TIERS } from '../../types/services';
import { cn } from '../../lib/utils';

interface OnboardingData {
  // Organization Info
  organizationName: string;
  organizationType: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  website: string;

  // Project Details
  projectName: string;
  projectDescription: string;
  serviceCategory: string;
  projectType: string;
  serviceTier: string;
  ensembleType: string;
  ensembleSize: number;
  ageGroup: string;

  // Timeline & Budget
  startDate: string;
  deadline: string;
  timeline: string;
  budgetRange: string;
  isFlexibleBudget: boolean;

  // Requirements
  specificRequirements: string;
  hasExistingDesigns: boolean;
  designReferences: string[];
  communicationPreferences: string[];
  additionalServices: string[];

  // Payment
  paymentTiming: string;
  agreedToTerms: boolean;
}

const steps = [
  {
    id: 'organization',
    title: 'Organization Info',
    description: 'Tell us about your organization',
    icon: Users
  },
  {
    id: 'project',
    title: 'Project Details',
    description: 'Describe your project vision',
    icon: Palette
  },
  {
    id: 'timeline',
    title: 'Timeline & Budget',
    description: 'Planning and investment details',
    icon: Calendar
  },
  {
    id: 'requirements',
    title: 'Requirements',
    description: 'Specific needs and preferences',
    icon: FileText
  },
  {
    id: 'review',
    title: 'Review & Payment',
    description: 'Finalize your project request',
    icon: CreditCard
  }
];

const ensembleTypes = [
  { value: 'marching-band', label: 'Marching Band', icon: '🎺' },
  { value: 'indoor-winds', label: 'Indoor Winds', icon: '🎷' },
  { value: 'winter-guard', label: 'Winter Guard', icon: '🏴' },
  { value: 'indoor-percussion', label: 'Indoor Percussion', icon: '🥁' },
  { value: 'drum-corps', label: 'Drum Corps', icon: '🎵' },
  { value: 'parade-band', label: 'Parade Band', icon: '🎉' },
  { value: 'pep-band', label: 'Pep Band', icon: '⭐' },
  { value: 'concert-band', label: 'Concert Band', icon: '🎼' }
];

const organizationTypes = [
  'Elementary School',
  'Middle School',
  'High School',
  'University/College',
  'Independent/Community',
  'Professional',
  'Non-Profit'
];

const ageGroups = [
  'Elementary (Ages 5-10)',
  'Middle School (Ages 11-13)',
  'High School (Ages 14-18)',
  'University (Ages 18-22)',
  'Independent (Ages 18+)',
  'All Age (Mixed Ages)'
];

const budgetRanges = [
  'Under $1,000',
  '$1,000 - $2,500',
  '$2,500 - $5,000',
  '$5,000 - $10,000',
  '$10,000 - $15,000',
  '$15,000+',
  'Custom Quote Needed'
];

interface ClientOnboardingProps {
  onComplete?: (data: OnboardingData) => void;
  onCancel?: () => void;
  initialData?: Partial<OnboardingData>;
}

export function ClientOnboarding({ onComplete, onCancel, initialData }: ClientOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({
    organizationName: '',
    organizationType: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    projectName: '',
    projectDescription: '',
    serviceCategory: '',
    projectType: '',
    serviceTier: '',
    ensembleType: '',
    ensembleSize: 0,
    ageGroup: '',
    startDate: '',
    deadline: '',
    timeline: '',
    budgetRange: '',
    isFlexibleBudget: false,
    specificRequirements: '',
    hasExistingDesigns: false,
    designReferences: [],
    communicationPreferences: [],
    additionalServices: [],
    paymentTiming: '',
    agreedToTerms: false,
    ...initialData
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateFormData = (updates: Partial<OnboardingData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(formData);
    }
  };

  // Validate current step
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Organization
        return formData.organizationName && formData.organizationType && formData.contactEmail;
      case 1: // Project
        return formData.projectName && formData.serviceCategory && formData.projectType && formData.serviceTier && formData.ensembleType;
      case 2: // Timeline
        return formData.timeline && formData.budgetRange;
      case 3: // Requirements
        return true; // All optional fields
      case 4: // Review
        return formData.agreedToTerms;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Flux Studio</h1>
          <p className="text-lg text-gray-600">Let's create something amazing together</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center space-x-1 mb-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive ? 'bg-blue-500 text-white' :
                  isCompleted ? 'bg-green-500 text-white' :
                  'bg-gray-100 text-gray-600'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <StepIcon className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 0 && (
            <OrganizationStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 1 && (
            <ProjectStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 2 && (
            <TimelineStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 3 && (
            <RequirementsStep formData={formData} updateFormData={updateFormData} />
          )}
          {currentStep === 4 && (
            <ReviewStep formData={formData} updateFormData={updateFormData} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
          className="min-w-[120px]"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            {steps[currentStep].description}
          </p>
        </div>

        <Button
          onClick={currentStep === steps.length - 1 ? handleComplete : nextStep}
          disabled={!isStepValid()}
          className="min-w-[120px]"
        >
          {currentStep === steps.length - 1 ? 'Submit Request' : 'Next'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step Components
function OrganizationStep({ formData, updateFormData }: { formData: OnboardingData; updateFormData: (updates: Partial<OnboardingData>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Organization Information
        </CardTitle>
        <CardDescription>
          Tell us about your organization so we can better understand your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              value={formData.organizationName}
              onChange={(e) => updateFormData({ organizationName: e.target.value })}
              placeholder="Westfield High School Marching Band"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgType">Organization Type *</Label>
            <Select value={formData.organizationType} onValueChange={(value) => updateFormData({ organizationType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization type" />
              </SelectTrigger>
              <SelectContent>
                {organizationTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateFormData({ location: e.target.value })}
              placeholder="City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => updateFormData({ website: e.target.value })}
              placeholder="https://yourschool.edu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => updateFormData({ contactEmail: e.target.value })}
              placeholder="director@yourschool.edu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              value={formData.contactPhone}
              onChange={(e) => updateFormData({ contactPhone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectStep({ formData, updateFormData }: { formData: OnboardingData; updateFormData: (updates: Partial<OnboardingData>) => void }) {
  const availableProjectTypes = formData.serviceCategory
    ? Object.entries(PROJECT_TYPE_DETAILS).filter(([_, details]) => details.category === formData.serviceCategory)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-blue-500" />
          Project Details
        </CardTitle>
        <CardDescription>
          Describe your creative vision and the type of services you need
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            value={formData.projectName}
            onChange={(e) => updateFormData({ projectName: e.target.value })}
            placeholder="Fall 2024 Marching Show"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectDescription">Project Description</Label>
          <Textarea
            id="projectDescription"
            value={formData.projectDescription}
            onChange={(e) => updateFormData({ projectDescription: e.target.value })}
            placeholder="Describe your vision, theme, or specific goals for this project"
            rows={4}
          />
        </div>

        {/* Service Category */}
        <div className="space-y-4">
          <Label>Service Category *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(SERVICE_OFFERINGS).map(([key, service]) => (
              <Card
                key={key}
                className={cn(
                  'cursor-pointer transition-all border-2',
                  formData.serviceCategory === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => updateFormData({ serviceCategory: key, projectType: '' })}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Project Type (appears after service category is selected) */}
        {formData.serviceCategory && (
          <div className="space-y-4">
            <Label>Specific Service *</Label>
            <div className="grid grid-cols-1 gap-3">
              {availableProjectTypes.map(([key, details]) => (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-all border-2',
                    formData.projectType === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => updateFormData({ projectType: key })}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{details.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{details.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>⏱️ {details.estimatedDuration}</span>
                          <span>📋 {details.deliverables.length} deliverables</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Service Tier */}
        {formData.projectType && (
          <div className="space-y-4">
            <Label>Service Tier *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(SERVICE_TIERS).map(([key, tier]) => (
                <Card
                  key={key}
                  className={cn(
                    'cursor-pointer transition-all border-2 relative',
                    formData.serviceTier === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => updateFormData({ serviceTier: key })}
                >
                  <CardContent className="p-4">
                    {key === 'elite' && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                          <Star className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 mb-2">{tier.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{tier.description}</p>
                    <div className="text-sm font-medium text-blue-600">{tier.priceRange}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Ensemble Details */}
        <div className="space-y-4">
          <Label>Ensemble Type *</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ensembleTypes.map(ensemble => (
              <Card
                key={ensemble.value}
                className={cn(
                  'cursor-pointer transition-all border-2',
                  formData.ensembleType === ensemble.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => updateFormData({ ensembleType: ensemble.value })}
              >
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-2">{ensemble.icon}</div>
                  <div className="text-sm font-medium">{ensemble.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ensembleSize">Ensemble Size</Label>
            <Input
              id="ensembleSize"
              type="number"
              value={formData.ensembleSize || ''}
              onChange={(e) => updateFormData({ ensembleSize: parseInt(e.target.value) || 0 })}
              placeholder="75"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageGroup">Age Group</Label>
            <Select value={formData.ageGroup} onValueChange={(value) => updateFormData({ ageGroup: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select age group" />
              </SelectTrigger>
              <SelectContent>
                {ageGroups.map(group => (
                  <SelectItem key={group} value={group}>{group}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineStep({ formData, updateFormData }: { formData: OnboardingData; updateFormData: (updates: Partial<OnboardingData>) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Timeline & Budget
        </CardTitle>
        <CardDescription>
          Help us plan the perfect timeline and understand your investment level
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="startDate">Preferred Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => updateFormData({ startDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Project Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => updateFormData({ deadline: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Project Timeline *</Label>
          <RadioGroup value={formData.timeline} onValueChange={(value) => updateFormData({ timeline: value })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rush" id="rush" />
              <Label htmlFor="rush">Rush (2-4 weeks) - Additional 50% fee</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard">Standard (4-8 weeks) - Normal timeline</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="extended" id="extended" />
              <Label htmlFor="extended">Extended (8+ weeks) - More collaboration time</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="flexible" id="flexible" />
              <Label htmlFor="flexible">Flexible - Work around your schedule</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label>Budget Range *</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {budgetRanges.map(range => (
              <Card
                key={range}
                className={cn(
                  'cursor-pointer transition-all border-2',
                  formData.budgetRange === range
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => updateFormData({ budgetRange: range })}
              >
                <CardContent className="p-3 text-center">
                  <div className="font-medium">{range}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="flexibleBudget"
            checked={formData.isFlexibleBudget}
            onCheckedChange={(checked) => updateFormData({ isFlexibleBudget: checked as boolean })}
          />
          <Label htmlFor="flexibleBudget">
            I'm flexible with budget for exceptional quality and results
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

function RequirementsStep({ formData, updateFormData }: { formData: OnboardingData; updateFormData: (updates: Partial<OnboardingData>) => void }) {
  const communicationOptions = [
    'Email updates',
    'Weekly video calls',
    'Project management platform',
    'Real-time messaging',
    'Phone calls',
    'In-person meetings'
  ];

  const additionalServiceOptions = [
    'Video production/documentation',
    'Competition preparation',
    'Staff training sessions',
    'Ongoing season support',
    'Equipment/prop construction guidance',
    'Performance coaching'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Requirements & Preferences
        </CardTitle>
        <CardDescription>
          Share any specific requirements, preferences, or additional details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="requirements">Specific Requirements or Vision</Label>
          <Textarea
            id="requirements"
            value={formData.specificRequirements}
            onChange={(e) => updateFormData({ specificRequirements: e.target.value })}
            placeholder="Share any specific design requirements, themes, color preferences, or creative vision you have in mind..."
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasExistingDesigns"
              checked={formData.hasExistingDesigns}
              onCheckedChange={(checked) => updateFormData({ hasExistingDesigns: checked as boolean })}
            />
            <Label htmlFor="hasExistingDesigns">
              I have existing designs, references, or previous work to share
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Communication Preferences</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {communicationOptions.map(option => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={option}
                  checked={formData.communicationPreferences.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFormData({
                        communicationPreferences: [...formData.communicationPreferences, option]
                      });
                    } else {
                      updateFormData({
                        communicationPreferences: formData.communicationPreferences.filter(p => p !== option)
                      });
                    }
                  }}
                />
                <Label htmlFor={option}>{option}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Additional Services (Optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {additionalServiceOptions.map(service => (
              <div key={service} className="flex items-center space-x-2">
                <Checkbox
                  id={service}
                  checked={formData.additionalServices.includes(service)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFormData({
                        additionalServices: [...formData.additionalServices, service]
                      });
                    } else {
                      updateFormData({
                        additionalServices: formData.additionalServices.filter(s => s !== service)
                      });
                    }
                  }}
                />
                <Label htmlFor={service}>{service}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewStep({ formData, updateFormData }: { formData: OnboardingData; updateFormData: (updates: Partial<OnboardingData>) => void }) {
  const selectedServiceCategory = SERVICE_OFFERINGS[formData.serviceCategory as keyof typeof SERVICE_OFFERINGS];
  const selectedProjectType = PROJECT_TYPE_DETAILS[formData.projectType as keyof typeof PROJECT_TYPE_DETAILS];
  const selectedServiceTier = SERVICE_TIERS[formData.serviceTier as keyof typeof SERVICE_TIERS];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Review Your Request
          </CardTitle>
          <CardDescription>
            Please review all details before submitting your project request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Summary */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Organization</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><strong>Name:</strong> {formData.organizationName}</div>
              <div><strong>Type:</strong> {formData.organizationType}</div>
              {formData.location && <div><strong>Location:</strong> {formData.location}</div>}
              <div><strong>Contact:</strong> {formData.contactEmail}</div>
            </div>
          </div>

          {/* Project Summary */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Project Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><strong>Project:</strong> {formData.projectName}</div>
              <div><strong>Ensemble:</strong> {ensembleTypes.find(e => e.value === formData.ensembleType)?.label}</div>
              {formData.ensembleSize > 0 && <div><strong>Size:</strong> {formData.ensembleSize} members</div>}
              <div><strong>Service:</strong> {selectedServiceCategory?.name} - {selectedProjectType?.name}</div>
              <div><strong>Tier:</strong> {selectedServiceTier?.name} ({selectedServiceTier?.priceRange})</div>
            </div>
          </div>

          {/* Timeline & Budget */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Timeline & Investment</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div><strong>Timeline:</strong> {formData.timeline}</div>
              <div><strong>Budget Range:</strong> {formData.budgetRange}</div>
              {formData.startDate && <div><strong>Start Date:</strong> {formData.startDate}</div>}
              {formData.deadline && <div><strong>Deadline:</strong> {formData.deadline}</div>}
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Payment Preference</h3>
            <RadioGroup value={formData.paymentTiming} onValueChange={(value) => updateFormData({ paymentTiming: value })}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deposit" id="deposit" />
                <Label htmlFor="deposit">50% deposit to start, 50% on completion</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full-upfront" id="full-upfront" />
                <Label htmlFor="full-upfront">Full payment upfront (5% discount)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="completion" id="completion" />
                <Label htmlFor="completion">Full payment on completion</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="installments" id="installments" />
                <Label htmlFor="installments">Monthly installments (for projects over $5,000)</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Terms Agreement */}
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) => updateFormData({ agreedToTerms: checked as boolean })}
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed">
                I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>. I understand that this request will be reviewed by the Flux Studio team, and I will receive a detailed proposal within 24-48 hours.
              </Label>
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Your request will be reviewed within 24 hours</li>
              <li>✓ You'll receive a detailed proposal with timeline and pricing</li>
              <li>✓ We'll schedule a consultation call to discuss your vision</li>
              <li>✓ Upon approval, work begins immediately</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default ClientOnboarding;
