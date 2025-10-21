/**
 * IntelligentMessageCard Component
 * Enhanced message display with AI-powered analysis and smart interactions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText,
  Calendar,
  User,
  Tag,
  Zap,
  TrendingUp,
  Heart,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Message, Conversation } from '../../types/messaging';
import { MessageAnalysis, messageIntelligenceService } from '../../services/messageIntelligenceService';
import { cn } from '../../lib/utils';

interface IntelligentMessageCardProps {
  message: Message;
  conversation: Conversation;
  currentUserId: string;
  className?: string;
  onResponseSelect?: (response: string) => void;
  onActionTrigger?: (action: string, data?: any) => void;
  showAnalysis?: boolean;
}

export function IntelligentMessageCard({
  message,
  conversation,
  currentUserId,
  className,
  onResponseSelect,
  onActionTrigger,
  showAnalysis = false
}: IntelligentMessageCardProps) {
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isOwnMessage = message.authorId === currentUserId;

  // Analyze message on mount and when message changes
  useEffect(() => {
    const analyzeMessage = async () => {
      setIsAnalyzing(true);
      try {
        const result = await messageIntelligenceService.analyzeMessage(message, conversation);
        setAnalysis(result);
      } catch (error) {
        console.error('Failed to analyze message:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeMessage();
  }, [message, conversation]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'design-feedback': return MessageSquare;
      case 'approval-request': return CheckCircle;
      case 'question': return Lightbulb;
      case 'deadline': return Clock;
      case 'resource-share': return FileText;
      case 'brainstorm': return Brain;
      case 'issue-report': return AlertTriangle;
      case 'celebration': return Heart;
      case 'coordination': return Target;
      default: return MessageSquare;
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  // Get emotion icon
  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'positive': return ThumbsUp;
      case 'excited': return Sparkles;
      case 'concerned': return AlertCircle;
      case 'negative': return ThumbsDown;
      default: return MessageSquare;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative',
        isOwnMessage ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]',
        className
      )}
    >
      <Card className={cn(
        'backdrop-blur-md border transition-all duration-300',
        isOwnMessage
          ? 'bg-blue-500/10 border-blue-500/20 text-white'
          : 'bg-white/5 border-white/10 text-white',
        analysis?.urgency === 'critical' && 'ring-2 ring-red-500/50',
        analysis?.urgency === 'high' && 'ring-1 ring-orange-500/30'
      )}>
        <CardContent className="p-4">
          {/* Header with user info and analysis indicators */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {!isOwnMessage && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.author?.avatar} />
                  <AvatarFallback className="text-xs">
                    {message.author?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {!isOwnMessage && (
                  <p className="text-sm font-medium text-white/90">
                    {message.author?.name}
                  </p>
                )}
                <p className="text-xs text-white/60">
                  {formatTimestamp(message.createdAt)}
                </p>
              </div>
            </div>

            {/* Analysis indicators */}
            {analysis && (
              <div className="flex items-center gap-1">
                {analysis.category && (
                  <Badge className={cn(
                    'text-xs px-2 py-1',
                    getUrgencyColor(analysis.urgency)
                  )}>
                    {React.createElement(getCategoryIcon(analysis.category), {
                      size: 12,
                      className: 'mr-1'
                    })}
                    {analysis.category.replace('-', ' ')}
                  </Badge>
                )}

                {showAnalysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="h-6 w-6 p-0 text-white/60 hover:text-white"
                  >
                    <Brain size={12} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Message content */}
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-white/90">
              {message.content}
            </p>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <FileText size={16} className="text-blue-400" />
                    <span className="text-sm text-white/80">{attachment.name}</span>
                    <span className="text-xs text-white/60 ml-auto">
                      {(attachment.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Extracted data highlights */}
            {analysis?.extractedData && (
              <div className="space-y-2">
                {/* Action items */}
                {analysis.extractedData.actionItems && analysis.extractedData.actionItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-orange-400">
                      <Target size={12} />
                      <span>Action Items</span>
                    </div>
                    {analysis.extractedData.actionItems.map((item, index) => (
                      <div
                        key={index}
                        className="text-xs text-white/70 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-1"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {/* Deadlines */}
                {analysis.extractedData.deadlines && analysis.extractedData.deadlines.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <Clock size={12} />
                      <span>Deadlines</span>
                    </div>
                    {analysis.extractedData.deadlines.map((deadline, index) => (
                      <div
                        key={index}
                        className="text-xs text-white/70 bg-red-500/10 border border-red-500/20 rounded px-2 py-1"
                      >
                        {deadline.toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Questions */}
                {analysis.extractedData.questions && analysis.extractedData.questions.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <Lightbulb size={12} />
                      <span>Questions</span>
                    </div>
                    {analysis.extractedData.questions.map((question, index) => (
                      <div
                        key={index}
                        className="text-xs text-white/70 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1"
                      >
                        {question}
                      </div>
                    ))}
                  </div>
                )}

                {/* Emotions */}
                {analysis.extractedData.emotions && analysis.extractedData.emotions.length > 0 && (
                  <div className="flex items-center gap-1">
                    {analysis.extractedData.emotions.map((emotion, index) => {
                      const EmotionIcon = getEmotionIcon(emotion);
                      return (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs px-2 py-1 border-white/20"
                        >
                          <EmotionIcon size={10} className="mr-1" />
                          {emotion}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggested responses (for non-own messages) */}
          {!isOwnMessage && analysis?.suggestedResponses && analysis.suggestedResponses.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-1 text-xs text-white/60">
                <Zap size={12} />
                <span>Quick Replies</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.suggestedResponses.slice(0, 2).map((response, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onResponseSelect?.(response)}
                    className="text-xs h-7 bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                  >
                    {response}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Detailed analysis (expandable) */}
          <AnimatePresence>
            {showDetails && analysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-white/10"
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-white/60">Category:</span>
                      <p className="text-white/90 capitalize">
                        {analysis.category.replace('-', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60">Intent:</span>
                      <p className="text-white/90 capitalize">
                        {analysis.intent.replace('-', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60">Urgency:</span>
                      <p className={cn('capitalize', getUrgencyColor(analysis.urgency).split(' ')[0])}>
                        {analysis.urgency}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60">Confidence:</span>
                      <p className="text-white/90">
                        {Math.round(analysis.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Workflow triggers */}
                  {analysis.workflowTriggers && analysis.workflowTriggers.length > 0 && (
                    <div>
                      <span className="text-xs text-white/60">Workflow Triggers:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.workflowTriggers.map((trigger, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs border-white/20"
                            onClick={() => onActionTrigger?.(trigger)}
                          >
                            <Zap size={10} className="mr-1" />
                            {trigger.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Brain size={12} />
              </motion.div>
              <span>Analyzing message...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default IntelligentMessageCard;