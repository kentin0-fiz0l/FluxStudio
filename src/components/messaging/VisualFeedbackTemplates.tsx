/**
 * VisualFeedbackTemplates Component
 * Pre-built templates for structured design feedback and reviews
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  MessageSquare,
  Palette,
  Layout,
  Type,
  Zap,
  Target,
  Users,
  Lightbulb,
  Send,
  X,
  Plus,
  Edit3
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface FeedbackCriteria {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  weight: number;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'approval' | 'design' | 'content' | 'technical' | 'general';
  criteria: FeedbackCriteria[];
  customFields?: {
    id: string;
    label: string;
    type: 'text' | 'rating' | 'checkbox' | 'radio' | 'textarea';
    options?: string[];
    required?: boolean;
  }[];
}

interface VisualFeedbackTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: any) => void;
  currentUser: MessageUser;
  attachmentUrl?: string;
  className?: string;
}

const feedbackTemplates: FeedbackTemplate[] = [
  {
    id: 'design-approval',
    name: 'Design Approval',
    description: 'Comprehensive design review and approval workflow',
    icon: CheckCircle,
    category: 'approval',
    criteria: [
      { id: 'visual-appeal', name: 'Visual Appeal', description: 'Overall aesthetic and visual impact', icon: Star, weight: 0.25 },
      { id: 'brand-alignment', name: 'Brand Alignment', description: 'Consistency with brand guidelines', icon: Target, weight: 0.25 },
      { id: 'functionality', name: 'Functionality', description: 'Usability and user experience', icon: Zap, weight: 0.3 },
      { id: 'technical-quality', name: 'Technical Quality', description: 'Technical execution and file quality', icon: Flag, weight: 0.2 }
    ],
    customFields: [
      { id: 'approval-status', label: 'Approval Status', type: 'radio', options: ['Approved', 'Approved with Minor Changes', 'Needs Revision', 'Rejected'], required: true },
      { id: 'priority-changes', label: 'Priority Changes Required', type: 'textarea', required: false },
      { id: 'deadline', label: 'Revision Deadline', type: 'text', required: false }
    ]
  },
  {
    id: 'ui-design-review',
    name: 'UI Design Review',
    description: 'Detailed user interface design assessment',
    icon: Layout,
    category: 'design',
    criteria: [
      { id: 'layout-structure', name: 'Layout & Structure', description: 'Information hierarchy and organization', icon: Layout, weight: 0.2 },
      { id: 'color-scheme', name: 'Color Scheme', description: 'Color choice and application', icon: Palette, weight: 0.2 },
      { id: 'typography', name: 'Typography', description: 'Font choices and text hierarchy', icon: Type, weight: 0.2 },
      { id: 'user-experience', name: 'User Experience', description: 'Intuitive navigation and interaction', icon: Users, weight: 0.25 },
      { id: 'responsive-design', name: 'Responsive Design', description: 'Multi-device compatibility', icon: Zap, weight: 0.15 }
    ],
    customFields: [
      { id: 'device-testing', label: 'Tested on Devices', type: 'checkbox', options: ['Desktop', 'Tablet', 'Mobile', 'Large Screens'] },
      { id: 'accessibility', label: 'Accessibility Considerations', type: 'checkbox', options: ['Color Contrast', 'Font Size', 'Alt Text', 'Keyboard Navigation'] }
    ]
  },
  {
    id: 'creative-feedback',
    name: 'Creative Feedback',
    description: 'Artistic and creative direction feedback',
    icon: Palette,
    category: 'design',
    criteria: [
      { id: 'creativity', name: 'Creativity', description: 'Originality and innovative approach', icon: Lightbulb, weight: 0.3 },
      { id: 'concept-execution', name: 'Concept Execution', description: 'How well the concept is realized', icon: Target, weight: 0.25 },
      { id: 'visual-impact', name: 'Visual Impact', description: 'Emotional and visual engagement', icon: Star, weight: 0.25 },
      { id: 'artistic-quality', name: 'Artistic Quality', description: 'Technical artistic skills', icon: Palette, weight: 0.2 }
    ],
    customFields: [
      { id: 'mood-rating', label: 'Mood Alignment', type: 'rating', required: true },
      { id: 'style-preference', label: 'Style Direction', type: 'radio', options: ['More Conservative', 'Current is Perfect', 'More Bold/Creative'] },
      { id: 'inspiration-references', label: 'Reference Images/Links', type: 'textarea' }
    ]
  },
  {
    id: 'content-review',
    name: 'Content Review',
    description: 'Text content and messaging evaluation',
    icon: MessageSquare,
    category: 'content',
    criteria: [
      { id: 'clarity', name: 'Clarity', description: 'Clear and understandable messaging', icon: MessageSquare, weight: 0.3 },
      { id: 'tone-voice', name: 'Tone & Voice', description: 'Appropriate brand voice and tone', icon: Type, weight: 0.25 },
      { id: 'accuracy', name: 'Accuracy', description: 'Factual correctness and completeness', icon: CheckCircle, weight: 0.25 },
      { id: 'engagement', name: 'Engagement', description: 'Compelling and engaging content', icon: Star, weight: 0.2 }
    ],
    customFields: [
      { id: 'grammar-check', label: 'Grammar & Spelling', type: 'radio', options: ['Perfect', 'Minor Issues', 'Needs Review'] },
      { id: 'target-audience', label: 'Target Audience Fit', type: 'rating', required: true },
      { id: 'call-to-action', label: 'Call-to-Action Effectiveness', type: 'rating' }
    ]
  },
  {
    id: 'quick-feedback',
    name: 'Quick Feedback',
    description: 'Fast, essential feedback for iterations',
    icon: Zap,
    category: 'general',
    criteria: [
      { id: 'overall-satisfaction', name: 'Overall Satisfaction', description: 'General satisfaction with the work', icon: Star, weight: 0.4 },
      { id: 'meets-requirements', name: 'Meets Requirements', description: 'Fulfills the project brief', icon: CheckCircle, weight: 0.3 },
      { id: 'next-steps', name: 'Next Steps Clear', description: 'Clear direction for improvements', icon: Flag, weight: 0.3 }
    ],
    customFields: [
      { id: 'quick-rating', label: 'Quick Rating', type: 'rating', required: true },
      { id: 'main-concern', label: 'Main Concern (if any)', type: 'textarea' },
      { id: 'next-action', label: 'Immediate Next Action', type: 'radio', options: ['Proceed as is', 'Minor revisions needed', 'Major revisions needed', 'Start over'] }
    ]
  }
];

export function VisualFeedbackTemplates({
  isOpen,
  onClose,
  onSubmitFeedback,
  currentUser,
  attachmentUrl,
  className
}: VisualFeedbackTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<FeedbackTemplate | null>(null);
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, number>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [overallRating, setOverallRating] = useState<number>(3);

  const handleCriteriaRating = (criteriaId: string, rating: number) => {
    setCriteriaRatings(prev => ({
      ...prev,
      [criteriaId]: rating
    }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const calculateWeightedScore = () => {
    if (!selectedTemplate) return 0;

    let totalScore = 0;
    let totalWeight = 0;

    selectedTemplate.criteria.forEach(criteria => {
      const rating = criteriaRatings[criteria.id] || 0;
      totalScore += rating * criteria.weight;
      totalWeight += criteria.weight;
    });

    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  };

  const handleSubmit = () => {
    if (!selectedTemplate) return;

    const feedback = {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      overallRating,
      weightedScore: calculateWeightedScore(),
      criteriaRatings,
      customFieldValues,
      additionalComments,
      submittedBy: currentUser,
      submittedAt: new Date(),
      attachmentUrl
    };

    onSubmitFeedback(feedback);
    onClose();
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setCriteriaRatings({});
    setCustomFieldValues({});
    setAdditionalComments('');
    setOverallRating(3);
  };

  const renderRatingStars = (current: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={cn(
              'w-6 h-6 transition-colors',
              rating <= current ? 'text-yellow-400' : 'text-gray-300'
            )}
          >
            <Star size={20} fill="currentColor" />
          </button>
        ))}
      </div>
    );
  };

  const renderCustomField = (field: typeof selectedTemplate.customFields[0]) => {
    if (!field) return null;

    switch (field.type) {
      case 'rating':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {renderRatingStars(
              customFieldValues[field.id] || 0,
              (rating) => handleCustomFieldChange(field.id, rating)
            )}
          </div>
        );

      case 'radio':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            <RadioGroup
              value={customFieldValues[field.id] || ''}
              onValueChange={(value) => handleCustomFieldChange(field.id, value)}
            >
              {field.options?.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="space-y-2">
              {field.options?.map(option => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={(customFieldValues[field.id] || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const currentValues = customFieldValues[field.id] || [];
                      if (checked) {
                        handleCustomFieldChange(field.id, [...currentValues, option]);
                      } else {
                        handleCustomFieldChange(field.id, currentValues.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm">{option}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            <Textarea
              value={customFieldValues[field.id] || ''}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              rows={3}
            />
          </div>
        );

      case 'text':
        return (
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            <input
              type="text"
              value={customFieldValues[field.id] || ''}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedTemplate ? selectedTemplate.name : 'Choose Feedback Template'}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedTemplate ? selectedTemplate.description : 'Select a template for structured feedback'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Template Selection Sidebar */}
          {!selectedTemplate && (
            <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-4">Feedback Templates</h3>
              <div className="space-y-3">
                {feedbackTemplates.map(template => {
                  const Icon = template.icon;
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            template.category === 'approval' && 'bg-green-100 text-green-600',
                            template.category === 'design' && 'bg-blue-100 text-blue-600',
                            template.category === 'content' && 'bg-purple-100 text-purple-600',
                            template.category === 'technical' && 'bg-orange-100 text-orange-600',
                            template.category === 'general' && 'bg-gray-100 text-gray-600'
                          )}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">{template.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {template.criteria.length} criteria
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template Form */}
          {selectedTemplate && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Template Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <selectedTemplate.icon size={24} className="text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    <Edit3 size={14} className="mr-1" />
                    Change Template
                  </Button>
                </div>

                {/* Overall Rating */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Label className="text-sm font-medium">Overall Rating</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {renderRatingStars(overallRating, setOverallRating)}
                    <span className="text-sm text-gray-600">
                      {overallRating}/5 stars
                    </span>
                  </div>
                </div>

                {/* Criteria Ratings */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Detailed Criteria</h4>
                  <div className="space-y-4">
                    {selectedTemplate.criteria.map(criteria => {
                      const Icon = criteria.icon;
                      return (
                        <div key={criteria.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Icon size={16} className="text-gray-600" />
                              <div>
                                <h5 className="font-medium text-sm">{criteria.name}</h5>
                                <p className="text-xs text-gray-500">{criteria.description}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(criteria.weight * 100)}% weight
                            </Badge>
                          </div>
                          {renderRatingStars(
                            criteriaRatings[criteria.id] || 0,
                            (rating) => handleCriteriaRating(criteria.id, rating)
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Weighted Score Display */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Weighted Score
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {calculateWeightedScore().toFixed(1)}/5.0
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom Fields */}
                {selectedTemplate.customFields && selectedTemplate.customFields.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Additional Information</h4>
                    <div className="space-y-4">
                      {selectedTemplate.customFields.map(field => (
                        <div key={field.id} className="space-y-2">
                          {renderCustomField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Comments */}
                <div>
                  <Label className="text-sm font-medium">Additional Comments</Label>
                  <Textarea
                    value={additionalComments}
                    onChange={(e) => setAdditionalComments(e.target.value)}
                    placeholder="Any additional feedback or suggestions..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-gray-50 p-4 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                  <Send size={16} className="mr-2" />
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default VisualFeedbackTemplates;