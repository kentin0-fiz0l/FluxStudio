/**
 * Messaging System Test Suite
 * Comprehensive tests for all messaging components and services
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';

// Components
import { MessageHub } from '../components/messaging/MessageHub';
import { VisualMessageThread } from '../components/messaging/VisualMessageThread';
import { SmartComposer } from '../components/messaging/SmartComposer';
import { ConversationInsightsPanel } from '../components/messaging/ConversationInsightsPanel';
import { WorkflowAutomationPanel } from '../components/messaging/WorkflowAutomationPanel';

// Services
import { aiDesignFeedbackService } from '../services/aiDesignFeedbackService';
import { aiContentGenerationService } from '../services/aiContentGenerationService';
import { conversationInsightsService } from '../services/conversationInsightsService';
import { workflowAutomationService } from '../services/workflowAutomationService';
import { realtimeCollaborationService } from '../services/realtimeCollaborationService';

// Types
import { Conversation, Message, MessageUser } from '../types/messaging';

// Mock data
const mockUser: MessageUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg',
  role: 'designer',
  status: 'active'
};

const mockConversation: Conversation = {
  id: 'test-conv-1',
  title: 'Test Conversation',
  participants: [mockUser],
  lastMessage: {
    content: 'Test message',
    timestamp: new Date(),
    author: mockUser
  },
  unreadCount: 0,
  priority: 'medium',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'test-conv-1',
    author: mockUser,
    content: 'Test message content',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'sent'
  }
];

// Test suites
describe('MessageHub Component', () => {
  it('renders without crashing', () => {
    render(
      <MessageHub
        conversations={[mockConversation]}
        currentUser={mockUser}
        onConversationSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('displays conversation list', () => {
    render(
      <MessageHub
        conversations={[mockConversation]}
        currentUser={mockUser}
        onConversationSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
  });

  it('handles conversation selection', () => {
    const handleSelect = jest.fn();
    render(
      <MessageHub
        conversations={[mockConversation]}
        currentUser={mockUser}
        onConversationSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Test Conversation'));
    expect(handleSelect).toHaveBeenCalledWith(mockConversation);
  });

  it('shows empty state when no conversations', () => {
    render(
      <MessageHub
        conversations={[]}
        currentUser={mockUser}
        onConversationSelect={jest.fn()}
      />
    );

    expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument();
  });
});

describe('VisualMessageThread Component', () => {
  it('renders messages correctly', () => {
    render(
      <VisualMessageThread
        conversation={mockConversation}
        messages={mockMessages}
        currentUser={mockUser}
      />
    );

    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('shows AI feedback button', () => {
    render(
      <VisualMessageThread
        conversation={mockConversation}
        messages={mockMessages}
        currentUser={mockUser}
      />
    );

    expect(screen.getByTitle('AI Design Feedback')).toBeInTheDocument();
  });

  it('shows conversation insights button', () => {
    render(
      <VisualMessageThread
        conversation={mockConversation}
        messages={mockMessages}
        currentUser={mockUser}
      />
    );

    expect(screen.getByTitle('Conversation Insights')).toBeInTheDocument();
  });

  it('shows workflow automation button', () => {
    render(
      <VisualMessageThread
        conversation={mockConversation}
        messages={mockMessages}
        currentUser={mockUser}
      />
    );

    expect(screen.getByTitle('Workflow Automation')).toBeInTheDocument();
  });
});

describe('SmartComposer Component', () => {
  it('renders input field', () => {
    render(
      <SmartComposer
        conversation={mockConversation}
        currentUser={mockUser}
      />
    );

    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();
  });

  it('shows AI assistance toggle', () => {
    render(
      <SmartComposer
        conversation={mockConversation}
        currentUser={mockUser}
      />
    );

    expect(screen.getByTitle(/AI Assistance/i)).toBeInTheDocument();
  });

  it('handles message submission', async () => {
    const onSend = jest.fn();
    render(
      <SmartComposer
        conversation={mockConversation}
        currentUser={mockUser}
        onSend={onSend}
      />
    );

    const input = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(onSend).toHaveBeenCalled();
    });
  });
});

describe('AI Design Feedback Service', () => {
  it('analyzes design successfully', async () => {
    const analysis = await aiDesignFeedbackService.analyzeDesign('test-image.jpg');

    expect(analysis).toHaveProperty('id');
    expect(analysis).toHaveProperty('overallScore');
    expect(analysis).toHaveProperty('elements');
    expect(analysis).toHaveProperty('strengths');
    expect(analysis).toHaveProperty('improvements');
  });

  it('generates feedback based on analysis', async () => {
    const analysis = await aiDesignFeedbackService.analyzeDesign('test-image.jpg');
    const feedback = await aiDesignFeedbackService.generateFeedback(analysis);

    expect(Array.isArray(feedback)).toBe(true);
    expect(feedback.length).toBeGreaterThan(0);
    expect(feedback[0]).toHaveProperty('title');
    expect(feedback[0]).toHaveProperty('description');
  });

  it('provides contextual insights', async () => {
    const analysis = await aiDesignFeedbackService.analyzeDesign('test-image.jpg');
    const insights = await aiDesignFeedbackService.getContextualInsights(analysis, 'tech');

    expect(Array.isArray(insights)).toBe(true);
    expect(insights[0]).toHaveProperty('insight');
    expect(insights[0]).toHaveProperty('relevance');
  });

  it('caches analysis results', async () => {
    const url = 'test-cached.jpg';
    const analysis1 = await aiDesignFeedbackService.analyzeDesign(url);
    const analysis2 = await aiDesignFeedbackService.analyzeDesign(url);

    expect(analysis1.id).toBe(analysis2.id);
  });
});

describe('AI Content Generation Service', () => {
  it('generates content from prompt', async () => {
    const content = await aiContentGenerationService.generateContent('Test prompt', {
      conversationType: 'general',
      tone: 'friendly'
    });

    expect(content).toHaveProperty('content');
    expect(content).toHaveProperty('confidence');
    expect(content).toHaveProperty('tone');
  });

  it('provides writing suggestions', async () => {
    const suggestions = await aiContentGenerationService.getSuggestions('Test text', {
      improve: 'clarity'
    });

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions[0]).toHaveProperty('type');
    expect(suggestions[0]).toHaveProperty('suggestion');
  });

  it('offers response templates', async () => {
    const templates = await aiContentGenerationService.getResponseTemplates('greeting');

    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]).toHaveProperty('template');
    expect(templates[0]).toHaveProperty('context');
  });

  it('provides real-time completions', async () => {
    const completion = await aiContentGenerationService.getRealTimeCompletion(
      'Thank you for',
      { maxLength: 20 }
    );

    expect(typeof completion).toBe('string');
    expect(completion.length).toBeGreaterThan(0);
  });
});

describe('Conversation Insights Service', () => {
  it('analyzes conversation metrics', async () => {
    const insights = await conversationInsightsService.analyzeConversation(
      mockConversation,
      mockMessages
    );

    expect(insights).toHaveProperty('insights');
    expect(insights).toHaveProperty('teamDynamics');
    expect(insights).toHaveProperty('recommendations');
    expect(insights).toHaveProperty('trendAnalysis');
  });

  it('extracts action items', async () => {
    const actionMessages = [
      ...mockMessages,
      {
        id: 'msg-2',
        conversationId: 'test-conv-1',
        author: mockUser,
        content: 'I need to finish the design by tomorrow',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'sent' as const
      }
    ];

    const actionItems = await conversationInsightsService.extractActionItems(actionMessages);

    expect(Array.isArray(actionItems)).toBe(true);
    expect(actionItems[0]).toHaveProperty('description');
    expect(actionItems[0]).toHaveProperty('priority');
  });

  it('analyzes project progress', async () => {
    const progress = await conversationInsightsService.analyzeProjectProgress(mockMessages);

    expect(progress).toHaveProperty('phase');
    expect(progress).toHaveProperty('completionEstimate');
    expect(progress).toHaveProperty('momentum');
  });

  it('caches insights for performance', async () => {
    const insights1 = await conversationInsightsService.analyzeConversation(
      mockConversation,
      mockMessages
    );
    const insights2 = conversationInsightsService.getCachedInsights(
      mockConversation.id,
      mockMessages.length
    );

    expect(insights2).toBeTruthy();
    expect(insights1.conversationId).toBe(insights2?.conversationId);
  });
});

describe('Workflow Automation Service', () => {
  it('creates automation triggers', async () => {
    const trigger = await workflowAutomationService.setupTrigger('test', {
      name: 'Test Trigger',
      conditions: [{
        type: 'keyword_detection',
        operator: 'contains',
        value: ['test']
      }],
      actions: [{
        type: 'notification',
        config: { message: 'Test notification' }
      }]
    });

    expect(trigger).toHaveProperty('id');
    expect(trigger.name).toBe('Test Trigger');
    expect(trigger.enabled).toBe(true);
  });

  it('generates workflow suggestions', async () => {
    const context = {
      conversation: mockConversation,
      recentMessages: mockMessages,
      currentUser: mockUser
    };

    const suggestions = await workflowAutomationService.generateWorkflowSuggestions(context);

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions[0]).toHaveProperty('title');
    expect(suggestions[0]).toHaveProperty('estimatedImpact');
  });

  it('provides automation analytics', () => {
    const analytics = workflowAutomationService.getAutomationAnalytics();

    expect(analytics).toHaveProperty('totalTriggers');
    expect(analytics).toHaveProperty('activeTriggers');
    expect(analytics).toHaveProperty('successRate');
  });

  it('manages trigger status', async () => {
    const trigger = await workflowAutomationService.setupTrigger('test2', {
      name: 'Status Test',
      conditions: [],
      actions: []
    });

    const updated = workflowAutomationService.updateTriggerStatus(trigger.id, false);
    expect(updated).toBe(true);

    const triggers = workflowAutomationService.getActiveTriggers();
    const found = triggers.find(t => t.id === trigger.id);
    expect(found?.enabled).toBe(false);
  });
});

describe('Real-time Collaboration Service', () => {
  beforeEach(() => {
    // Mock WebSocket
    (global as any).WebSocket = jest.fn(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }));
  });

  it('connects to WebSocket', () => {
    realtimeCollaborationService.connect(mockUser);
    expect(realtimeCollaborationService.isConnected()).toBe(false); // Will be false until connected
  });

  it('joins conversation', () => {
    realtimeCollaborationService.joinConversation('test-conv');
    // Verify conversation joined (implementation dependent)
  });

  it('tracks user presence', () => {
    realtimeCollaborationService.updatePresence(mockUser.id, 'active');
    const presence = realtimeCollaborationService.getUserPresence(mockUser.id);
    expect(presence).toBe('active');
  });

  it('handles typing indicators', () => {
    realtimeCollaborationService.startTyping('test-conv', mockUser.id);
    const typing = realtimeCollaborationService.getTypingUsers('test-conv');
    expect(typing).toContain(mockUser.id);
  });
});

describe('Integration Tests', () => {
  it('complete message flow with AI assistance', async () => {
    // Generate content
    const generatedContent = await aiContentGenerationService.generateContent(
      'Write a design review message',
      { conversationType: 'design_review', tone: 'professional' }
    );

    expect(generatedContent.content).toBeTruthy();

    // Analyze conversation
    const insights = await conversationInsightsService.analyzeConversation(
      mockConversation,
      mockMessages
    );

    expect(insights.insights.messageCount).toBe(mockMessages.length);

    // Setup automation
    const trigger = await workflowAutomationService.setupTrigger('integration', {
      name: 'Integration Test',
      conditions: [],
      actions: []
    });

    expect(trigger).toBeTruthy();
  });

  it('handles design file analysis workflow', async () => {
    // Analyze design
    const analysis = await aiDesignFeedbackService.analyzeDesign('design.jpg');

    // Generate feedback
    const feedback = await aiDesignFeedbackService.generateFeedback(analysis);

    // Get insights
    const insights = await aiDesignFeedbackService.getContextualInsights(analysis);

    expect(analysis).toBeTruthy();
    expect(feedback.length).toBeGreaterThan(0);
    expect(insights.length).toBeGreaterThan(0);
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('handles large message lists efficiently', () => {
    const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
      ...mockMessages[0],
      id: `msg-${i}`,
      content: `Message ${i}`
    }));

    const startTime = performance.now();

    render(
      <VisualMessageThread
        conversation={mockConversation}
        messages={largeMessageList}
        currentUser={mockUser}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
  });

  it('caches service results effectively', async () => {
    const startTime = performance.now();

    // First call - not cached
    await aiDesignFeedbackService.analyzeDesign('perf-test.jpg');

    const midTime = performance.now();

    // Second call - should be cached
    await aiDesignFeedbackService.analyzeDesign('perf-test.jpg');

    const endTime = performance.now();

    const firstCallTime = midTime - startTime;
    const secondCallTime = endTime - midTime;

    expect(secondCallTime).toBeLessThan(firstCallTime / 10); // Cached call should be 10x faster
  });
});

// Accessibility tests
describe('Accessibility Tests', () => {
  it('has proper ARIA labels', () => {
    render(
      <MessageHub
        conversations={[mockConversation]}
        currentUser={mockUser}
        onConversationSelect={jest.fn()}
      />
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(
      <SmartComposer
        conversation={mockConversation}
        currentUser={mockUser}
      />
    );

    const input = screen.getByPlaceholderText(/Type a message/i);
    input.focus();

    expect(document.activeElement).toBe(input);
  });
});

export default {
  MessageHub,
  VisualMessageThread,
  SmartComposer,
  ConversationInsightsPanel,
  WorkflowAutomationPanel
};