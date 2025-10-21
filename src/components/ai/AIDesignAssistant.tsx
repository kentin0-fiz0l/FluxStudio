/**
 * AI Design Assistant Component
 * Provides intelligent design suggestions and real-time collaboration features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import {
  Lightbulb,
  Palette,
  Layout,
  Type,
  Eye,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Brain,
  Users,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { aiDesignAssistant, type DesignSuggestion, type ColorPalette, type LayoutAnalysis, type CollaborationInsight } from '../../services/aiDesignAssistant';

interface AIDesignAssistantProps {
  projectId?: string;
  currentDesign?: any;
  isVisible: boolean;
  onSuggestionApply?: (suggestion: DesignSuggestion) => void;
}

export function AIDesignAssistant({
  projectId,
  currentDesign,
  isVisible,
  onSuggestionApply
}: AIDesignAssistantProps) {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<DesignSuggestion[]>([]);
  const [colorPalettes, setColorPalettes] = useState<ColorPalette[]>([]);
  const [layoutAnalysis, setLayoutAnalysis] = useState<LayoutAnalysis | null>(null);
  const [collaborationInsights, setCollaborationInsights] = useState<CollaborationInsight[]>([]);
  const [realTimeSuggestions, setRealTimeSuggestions] = useState<DesignSuggestion[]>([]);

  // Auto-analyze design when it changes
  useEffect(() => {
    if (currentDesign && isVisible) {
      analyzeDesign();
    }
  }, [currentDesign, isVisible]);

  const analyzeDesign = useCallback(async () => {
    if (!currentDesign) return;

    setIsAnalyzing(true);
    try {
      const [designSuggestions, palettes, layoutAnalysisData] = await Promise.all([
        aiDesignAssistant.analyzeDesign({
          designElements: currentDesign.elements,
          context: currentDesign.context,
        }),
        aiDesignAssistant.generateColorPalette({
          industry: currentDesign.industry,
          mood: currentDesign.mood,
        }),
        aiDesignAssistant.analyzeLayout({
          elements: currentDesign.elements || [],
          viewport: { width: 1920, height: 1080 },
        }),
      ]);

      setSuggestions(designSuggestions);
      setColorPalettes(palettes);
      setLayoutAnalysis(layoutAnalysisData);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentDesign]);

  const loadCollaborationInsights = useCallback(async () => {
    if (!projectId) return;

    try {
      const insights = await aiDesignAssistant.analyzeCollaboration({
        messages: [],
        feedback: [],
        designIterations: [],
        teamMembers: [],
      });
      setCollaborationInsights(insights);
    } catch (error) {
      console.error('Failed to load collaboration insights:', error);
    }
  }, [projectId]);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'color': return <Palette className="h-4 w-4" />;
      case 'layout': return <Layout className="h-4 w-4" />;
      case 'typography': return <Type className="h-4 w-4" />;
      case 'spacing': return <Layout className="h-4 w-4" />;
      case 'accessibility': return <Eye className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const renderSuggestionCard = (suggestion: DesignSuggestion) => (
    <Card key={suggestion.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getSuggestionIcon(suggestion.type)}
            <CardTitle className="text-sm">{suggestion.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getImpactColor(suggestion.impact)}>
              {suggestion.impact}
            </Badge>
            <Badge variant="outline">
              {Math.round(suggestion.confidence * 100)}%
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          {suggestion.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <p><strong>Why:</strong> {suggestion.reasoning}</p>
        </div>

        {suggestion.implementation.css && (
          <div className="bg-muted p-3 rounded-md">
            <code className="text-xs">{suggestion.implementation.css}</code>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {suggestion.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSuggestionApply?.(suggestion)}
            className="flex-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Apply
          </Button>
          <Button size="sm" variant="outline">
            <Info className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderColorPalette = (palette: ColorPalette) => (
    <Card key={palette.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{palette.name}</CardTitle>
          <Badge variant="outline">{palette.harmony}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {palette.colors.map((color, index) => (
            <div key={index} className="space-y-1">
              <div
                className="w-full h-8 rounded border"
                style={{ backgroundColor: color.hex }}
                title={`${color.name} - ${color.hex}`}
              />
              <div className="text-xs text-center">
                <div className="font-medium">{color.role}</div>
                <div className="text-muted-foreground">{color.hex}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs space-y-1">
          <div>
            <strong>Mood:</strong> {palette.mood.join(', ')}
          </div>
          <div>
            <strong>Industry:</strong> {palette.industry.join(', ')}
          </div>
        </div>

        <Button size="sm" className="w-full">
          <Palette className="h-3 w-3 mr-1" />
          Apply Palette
        </Button>
      </CardContent>
    </Card>
  );

  const renderLayoutAnalysis = () => {
    if (!layoutAnalysis) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Layout Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Score</span>
                <span className="text-sm font-medium">{layoutAnalysis.score}/10</span>
              </div>
              <Progress value={layoutAnalysis.score * 10} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Issues Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {layoutAnalysis.issues.map((issue, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                <div className="space-y-1 flex-1">
                  <div className="text-sm font-medium">{issue.description}</div>
                  <div className="text-xs text-muted-foreground">{issue.suggestion}</div>
                  <Badge variant="outline" className="text-xs">
                    {issue.severity} severity
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {layoutAnalysis.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {strength}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCollaborationInsights = () => (
    <div className="space-y-4">
      {collaborationInsights.map((insight) => (
        <Card key={insight.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {insight.title}
              </CardTitle>
              <Badge variant="outline">
                {Math.round(insight.confidence * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{insight.insight}</p>

            {insight.actionable && (
              <div className="space-y-2">
                <div className="text-xs font-medium">Suggested Actions:</div>
                <div className="space-y-1">
                  {insight.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="w-80 h-full bg-background border-l flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Design Assistant</h2>
          {isAnalyzing && <Sparkles className="h-4 w-4 animate-pulse text-yellow-500" />}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 m-2">
            <TabsTrigger value="suggestions" className="text-xs">
              <Lightbulb className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="colors" className="text-xs">
              <Palette className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <TrendingUp className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="suggestions" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {isAnalyzing ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Analyzing design...</p>
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map(renderSuggestionCard)
                  ) : (
                    <div className="text-center py-8">
                      <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No suggestions available</p>
                      <Button size="sm" onClick={analyzeDesign} className="mt-2">
                        Analyze Design
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="colors" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {colorPalettes.length > 0 ? (
                    colorPalettes.map(renderColorPalette)
                  ) : (
                    <div className="text-center py-8">
                      <Palette className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No color palettes available</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="layout" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {renderLayoutAnalysis()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="insights" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {collaborationInsights.length > 0 ? (
                    renderCollaborationInsights()
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No insights available</p>
                      <Button size="sm" onClick={loadCollaborationInsights} className="mt-2">
                        Analyze Collaboration
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}