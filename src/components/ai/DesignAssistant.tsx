import React, { useState, useEffect } from 'react';
import aiService from '@/services/aiService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Code, Eye, Loader2, AlertCircle } from 'lucide-react';

type Tab = 'review' | 'codegen';
type Aspect = 'overall' | 'accessibility' | 'usability' | 'aesthetics' | 'consistency';

const ASPECTS: Aspect[] = ['overall', 'accessibility', 'usability', 'aesthetics', 'consistency'];
const COMPONENT_TYPES = ['button', 'card', 'form', 'modal', 'component'] as const;
const STYLES = ['minimal', 'modern', 'playful'] as const;

const AIDesignAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('review');
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Design Review state
  const [reviewDescription, setReviewDescription] = useState('');
  const [selectedAspects, setSelectedAspects] = useState<Aspect[]>(['overall']);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // Code Generation state
  const [codeDescription, setCodeDescription] = useState('');
  const [componentType, setComponentType] = useState<typeof COMPONENT_TYPES[number]>('component');
  const [style, setStyle] = useState<typeof STYLES[number]>('modern');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    aiService.checkHealth().then((health) => {
      if (!health.hasApiKey) {
        setConfigured(false);
      }
    });
  }, []);

  const toggleAspect = (aspect: Aspect) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const handleReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.reviewDesign({
        description: reviewDescription,
        aspects: selectedAspects,
      });
      setReviewFeedback(result.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Design review failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.generateCode({
        description: codeDescription,
        componentType,
        style,
      });
      setGeneratedCode(result.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Design Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!configured && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI service not configured. Please set up your API key to use AI features.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'review' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('review')}
          >
            <Eye className="h-4 w-4 mr-2" />
            Design Review
          </Button>
          <Button
            variant={activeTab === 'codegen' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('codegen')}
          >
            <Code className="h-4 w-4 mr-2" />
            Code Generation
          </Button>
        </div>

        {activeTab === 'review' && (
          <div className="space-y-4">
            <textarea
              className="w-full border rounded p-2 min-h-[100px]"
              placeholder="Describe your design..."
              value={reviewDescription}
              onChange={(e) => setReviewDescription(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              {ASPECTS.map((aspect) => (
                <label key={aspect} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAspects.includes(aspect)}
                    onChange={() => toggleAspect(aspect)}
                  />
                  {aspect.charAt(0).toUpperCase() + aspect.slice(1)}
                </label>
              ))}
            </div>
            <Button
              onClick={handleReview}
              disabled={loading || !reviewDescription.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Review Design
            </Button>
            {reviewFeedback && (
              <div className="mt-4 p-3 border rounded bg-muted" style={{ whiteSpace: 'pre-wrap' }}>
                {reviewFeedback}
              </div>
            )}
          </div>
        )}

        {activeTab === 'codegen' && (
          <div className="space-y-4">
            <textarea
              className="w-full border rounded p-2 min-h-[100px]"
              placeholder="Describe the component you want to generate..."
              value={codeDescription}
              onChange={(e) => setCodeDescription(e.target.value)}
            />
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Component Type</label>
                <select
                  className="border rounded p-2"
                  value={componentType}
                  onChange={(e) => setComponentType(e.target.value as typeof COMPONENT_TYPES[number])}
                >
                  {COMPONENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Style</label>
                <select
                  className="border rounded p-2"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as typeof STYLES[number])}
                >
                  {STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !codeDescription.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Generate Code
            </Button>
            {generatedCode && (
              <pre className="mt-4 p-3 border rounded bg-muted overflow-x-auto">
                <code>{generatedCode}</code>
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIDesignAssistant;
