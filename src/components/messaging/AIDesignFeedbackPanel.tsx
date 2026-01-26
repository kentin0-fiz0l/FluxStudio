/**
 * AIDesignFeedbackPanel Component
 * AI-powered design analysis and feedback generation for images
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Eye,
  Palette,
  Type,
  Layout,
  BarChart3,
  Star,
  ThumbsUp,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import {
  aiDesignFeedbackService,
  DesignAnalysis,
  FeedbackSuggestion,
  ContextualInsight
} from '../../services/aiDesignFeedbackService';
import { MessageUser } from '../../types/messaging';

interface AIDesignFeedbackPanelProps {
  imageUrl: string;
  currentUser: MessageUser;
  onFeedbackGenerated?: (feedback: string) => void;
  onInsertSuggestion?: (suggestion: FeedbackSuggestion) => void;
  className?: string;
}

export function AIDesignFeedbackPanel({
  imageUrl,
  currentUser,
  onFeedbackGenerated,
  onInsertSuggestion,
  className
}: AIDesignFeedbackPanelProps) {
  const [analysis, setAnalysis] = useState<DesignAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<FeedbackSuggestion[]>([]);
  const [insights, setInsights] = useState<ContextualInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overall']));
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrl) {
      analyzeDesign();
    }
  }, [imageUrl]);

  const analyzeDesign = async () => {
    if (!imageUrl) return;

    setIsAnalyzing(true);
    try {
      // Check cache first
      const cached = aiDesignFeedbackService.getCachedAnalysis(imageUrl);
      if (cached) {
        setAnalysis(cached);
        generateFeedbackAndInsights(cached);
        setIsAnalyzing(false);
        return;
      }

      // Perform new analysis
      const result = await aiDesignFeedbackService.analyzeDesign(imageUrl, {
        userType: currentUser.userType,
        timestamp: new Date()
      });

      setAnalysis(result);
      generateFeedbackAndInsights(result);
    } catch (error) {
      console.error('Failed to analyze design:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFeedbackAndInsights = async (analysis: DesignAnalysis) => {
    try {
      const [feedbackSuggestions, contextualInsights] = await Promise.all([
        aiDesignFeedbackService.generateFeedback(analysis, {
          userRole: currentUser.userType,
          preferences: 'professional'
        }),
        aiDesignFeedbackService.getContextualInsights(analysis, 'design')
      ]);

      setSuggestions(feedbackSuggestions);
      setInsights(contextualInsights);
    } catch (error) {
      console.error('Failed to generate feedback:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleInsertFeedback = (suggestion: FeedbackSuggestion) => {
    const feedbackText = `**${suggestion.title}**\n${suggestion.description}${
      suggestion.examples ? '\n\nSuggestions:\n' + suggestion.examples.map(ex => `• ${ex}`).join('\n') : ''
    }`;

    onFeedbackGenerated?.(feedbackText);
    onInsertSuggestion?.(suggestion);
  };

  const generateComprehensiveFeedback = () => {
    if (!analysis) return;

    let feedback = `## AI Design Analysis\n\n`;

    // Overall score
    feedback += `**Overall Score:** ${Math.round(analysis.overallScore * 100)}/100\n\n`;

    // Strengths
    if (analysis.strengths.length > 0) {
      feedback += `**Strengths:**\n${analysis.strengths.map(s => `✅ ${s}`).join('\n')}\n\n`;
    }

    // Improvements
    if (analysis.improvements.length > 0) {
      feedback += `**Areas for Improvement:**\n${analysis.improvements.map(i => `🔄 ${i}`).join('\n')}\n\n`;
    }

    // Mood analysis
    if (analysis.moodAnalysis) {
      feedback += `**Mood & Emotional Impact:**\n`;
      feedback += `Primary mood: ${analysis.moodAnalysis.mood}\n`;
      feedback += `Emotions evoked: ${analysis.moodAnalysis.emotions.join(', ')}\n\n`;
    }

    // Top suggestions
    const topSuggestions = suggestions.filter(s => s.priority === 'high').slice(0, 3);
    if (topSuggestions.length > 0) {
      feedback += `**Priority Recommendations:**\n${topSuggestions.map(s => `🎯 ${s.description}`).join('\n')}\n\n`;
    }

    feedback += `*Generated by AI Design Assistant*`;

    onFeedbackGenerated?.(feedback);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getSuggestionIcon = (type: FeedbackSuggestion['type']) => {
    switch (type) {
      case 'improvement': return AlertCircle;
      case 'praise': return ThumbsUp;
      case 'question': return MessageSquare;
      case 'suggestion': return Lightbulb;
      default: return Lightbulb;
    }
  };

  const getElementIcon = (elementType: string) => {
    switch (elementType) {
      case 'color': return Palette;
      case 'typography': return Type;
      case 'layout': return Layout;
      case 'imagery': return Eye;
      case 'spacing': return BarChart3;
      case 'composition': return Target;
      default: return Sparkles;
    }
  };

  if (isAnalyzing) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4 flex-col">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain size={32} className="text-blue-600" />
            </motion.div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">AI Analyzing Design</h3>
              <p className="text-sm text-gray-600">Evaluating composition, colors, typography, and more...</p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={65} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6 text-center">
          <Brain size={32} className="mx-auto text-gray-400 mb-4" />
          <h3 className="font-semibold text-lg mb-2">AI Design Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">
            Get intelligent feedback on design elements, composition, and user experience.
          </p>
          <Button onClick={analyzeDesign} className="bg-blue-600 hover:bg-blue-700">
            <Sparkles size={16} className="mr-2" />
            Analyze Design
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="text-blue-600" size={20} />
              AI Design Analysis
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generateComprehensiveFeedback}
              >
                <MessageSquare size={14} className="mr-1" />
                Generate Report
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={analyzeDesign}
              >
                <Loader2 size={14} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="suggestions">
                Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-4">
              {/* Overall Score */}
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  expandedSections.has('overall') ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                )}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleSection('overall')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', getScoreColor(analysis.overallScore))}>
                      <span className="text-lg font-bold">
                        {Math.round(analysis.overallScore * 100)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Overall Design Score</h3>
                      <p className="text-sm text-gray-600">Comprehensive analysis</p>
                    </div>
                  </div>
                  {expandedSections.has('overall') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                <AnimatePresence>
                  {expandedSections.has('overall') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {analysis.brandAlignment && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Brand Alignment</span>
                          <div className="flex items-center gap-2">
                            <Progress value={analysis.brandAlignment * 100} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(analysis.brandAlignment * 100)}%</span>
                          </div>
                        </div>
                      )}
                      {analysis.accessibilityScore && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Accessibility</span>
                          <div className="flex items-center gap-2">
                            <Progress value={analysis.accessibilityScore * 100} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(analysis.accessibilityScore * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Design Elements */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Design Elements</h4>
                {analysis.elements.map((element, index) => {
                  const Icon = getElementIcon(element.type);
                  const isExpanded = expandedSections.has(`element-${index}`);

                  return (
                    <div
                      key={index}
                      className={cn(
                        'p-3 rounded-lg border transition-colors',
                        isExpanded ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50',
                        hoveredElement === `element-${index}` ? 'ring-2 ring-blue-200' : ''
                      )}
                      onMouseEnter={() => setHoveredElement(`element-${index}`)}
                      onMouseLeave={() => setHoveredElement(null)}
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleSection(`element-${index}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className="text-gray-600" />
                          <div>
                            <h5 className="font-medium text-sm capitalize">{element.type}</h5>
                            <p className="text-xs text-gray-600">
                              Confidence: {Math.round(element.confidence * 100)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={element.confidence * 100} className="w-16 h-1" />
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3"
                          >
                            <p className="text-sm text-gray-700">{element.description}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Mood Analysis */}
              {analysis.moodAnalysis && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Palette size={16} className="text-purple-600" />
                    Emotional Impact
                  </h4>
                  <p className="text-sm mb-2">
                    <strong>Primary Mood:</strong> {analysis.moodAnalysis.mood}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {analysis.moodAnalysis.emotions.map(emotion => (
                      <Badge key={emotion} variant="secondary" className="text-xs">
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-3">
              {suggestions.map((suggestion) => {
                const Icon = getSuggestionIcon(suggestion.type);
                const priorityColors = {
                  high: 'border-red-200 bg-red-50',
                  medium: 'border-yellow-200 bg-yellow-50',
                  low: 'border-green-200 bg-green-50'
                };

                return (
                  <Card key={suggestion.id} className={cn('cursor-pointer hover:shadow-md transition-shadow', priorityColors[suggestion.priority])}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          suggestion.priority === 'high' ? 'bg-red-100 text-red-600' :
                          suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        )}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">{suggestion.title}</h5>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">
                                {suggestion.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.category}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>

                          {suggestion.examples && suggestion.examples.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-600 mb-1">Examples:</p>
                              <ul className="space-y-1">
                                {suggestion.examples.map((example, idx) => (
                                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                    <span className="text-blue-600">•</span>
                                    {example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInsertFeedback(suggestion)}
                              className="text-xs h-7"
                            >
                              <MessageSquare size={12} className="mr-1" />
                              Insert as Feedback
                            </Button>
                            {suggestion.actionable && (
                              <Button size="sm" variant="ghost" className="text-xs h-7">
                                <ExternalLink size={12} className="mr-1" />
                                Learn More
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {suggestions.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles size={32} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No specific suggestions at this time.</p>
                  <p className="text-xs text-gray-500">This design appears to follow best practices well!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-3">
              {insights.map((insight) => (
                <Card key={insight.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <TrendingUp size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.type.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Star size={12} className="text-yellow-500" />
                            <span className="text-xs text-gray-600">
                              {Math.round(insight.relevance * 100)}% relevance
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{insight.insight}</p>
                        <p className="text-xs text-gray-500">Source: {insight.source}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {insights.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb size={32} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No contextual insights available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default AIDesignFeedbackPanel;