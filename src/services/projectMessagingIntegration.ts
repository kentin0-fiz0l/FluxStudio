/**
 * Project-Messaging Integration Service
 * Connects projects with conversations and enables cross-feature workflows
 */

import { Project } from '../types/organization';
import { Conversation, Message, MessageUser, ConversationType } from '../types/messaging';
import { messagingService } from './messagingService';

interface ProjectConversationLink {
  projectId: string;
  conversationId: string;
  linkType: 'primary' | 'related' | 'archived';
  createdAt: Date;
  createdBy: string;
  metadata?: {
    autoLinked?: boolean;
    stage?: string;
    purpose?: string;
  };
}

interface ProjectActivity {
  id: string;
  projectId: string;
  type: 'conversation_created' | 'message_sent' | 'file_shared' | 'review_requested' | 'milestone_reached';
  title: string;
  description: string;
  conversationId?: string;
  messageId?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class ProjectMessagingIntegrationService {
  private links: Map<string, ProjectConversationLink[]> = new Map(); // projectId -> links
  private conversationProjects: Map<string, string> = new Map(); // conversationId -> projectId
  private projectActivities: Map<string, ProjectActivity[]> = new Map(); // projectId -> activities

  /**
   * Create a conversation for a project
   */
  async createProjectConversation(
    project: Project,
    options: {
      type?: ConversationType;
      name?: string;
      description?: string;
      participants: MessageUser[];
      purpose?: 'general' | 'review' | 'planning' | 'client-communication';
      autoLink?: boolean;
    }
  ): Promise<{ conversation: Conversation; link: ProjectConversationLink }> {
    const conversationName = options.name || this.generateConversationName(project, options.purpose);
    const description = options.description || this.generateConversationDescription(project, options.purpose);

    // Create the conversation
    const conversation = await messagingService.createConversation({
      type: options.type || 'project',
      name: conversationName,
      description,
      participants: options.participants.map(p => p.id),
      projectId: project.id,
      metadata: {
        isArchived: false,
        isMuted: false,
        isPinned: options.purpose === 'client-communication',
        priority: options.purpose === 'client-communication' ? 'high' : 'medium',
        tags: [project.metadata.projectType, options.purpose || 'general']
      }
    });

    // Create the link
    const link: ProjectConversationLink = {
      projectId: project.id,
      conversationId: conversation.id,
      linkType: 'primary',
      createdAt: new Date(),
      createdBy: options.participants[0]?.id || 'system',
      metadata: {
        autoLinked: options.autoLink || false,
        purpose: options.purpose
      }
    };

    this.addProjectConversationLink(link);

    // Add initial activity
    this.addProjectActivity({
      id: `activity-${Date.now()}`,
      projectId: project.id,
      type: 'conversation_created',
      title: 'Conversation Created',
      description: `New ${options.purpose || 'project'} conversation: ${conversationName}`,
      conversationId: conversation.id,
      userId: link.createdBy,
      userName: options.participants[0]?.name || 'System',
      timestamp: new Date(),
      metadata: { purpose: options.purpose }
    });

    return { conversation, link };
  }

  /**
   * Link an existing conversation to a project
   */
  linkConversationToProject(
    projectId: string,
    conversationId: string,
    linkType: ProjectConversationLink['linkType'] = 'related',
    metadata?: ProjectConversationLink['metadata']
  ): ProjectConversationLink {
    const link: ProjectConversationLink = {
      projectId,
      conversationId,
      linkType,
      createdAt: new Date(),
      createdBy: 'user', // Would get from auth context
      metadata
    };

    this.addProjectConversationLink(link);
    return link;
  }

  /**
   * Get all conversations for a project
   */
  getProjectConversations(projectId: string): ProjectConversationLink[] {
    return this.links.get(projectId) || [];
  }

  /**
   * Get the primary project for a conversation
   */
  getConversationProject(conversationId: string): string | null {
    return this.conversationProjects.get(conversationId) || null;
  }

  /**
   * Get project activity timeline
   */
  getProjectActivity(projectId: string): ProjectActivity[] {
    return this.projectActivities.get(projectId) || [];
  }

  /**
   * Send a project-related message
   */
  async sendProjectMessage(
    projectId: string,
    conversationId: string,
    content: string,
    options?: {
      type?: 'update' | 'question' | 'review-request' | 'milestone' | 'file-share';
      attachments?: File[];
      mentions?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<Message> {
    // Send the message
    const message = await messagingService.sendMessage({
      conversationId,
      type: options?.attachments?.length ? 'file' : 'text',
      content,
      attachments: options?.attachments,
      mentions: options?.mentions,
      metadata: {
        projectId,
        messageType: options?.type,
        ...options?.metadata
      }
    });

    // Add to project activity
    this.addProjectActivity({
      id: `activity-${Date.now()}`,
      projectId,
      type: 'message_sent',
      title: this.getMessageTitle(options?.type),
      description: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
      conversationId,
      messageId: message.id,
      userId: message.author.id,
      userName: message.author.name,
      timestamp: new Date(),
      metadata: { messageType: options?.type }
    });

    return message;
  }

  /**
   * Create automatic project conversations based on project stage
   */
  async createStageConversations(
    project: Project,
    clientUsers: MessageUser[],
    teamUsers: MessageUser[]
  ): Promise<Conversation[]> {
    const conversations: Conversation[] = [];

    // Client communication conversation
    const clientConv = await this.createProjectConversation(project, {
      name: `${project.name} - Client Communication`,
      participants: [...clientUsers, ...teamUsers.slice(0, 2)], // Include lead designers
      purpose: 'client-communication',
      autoLink: true
    });
    conversations.push(clientConv.conversation);

    // Team planning conversation
    const teamConv = await this.createProjectConversation(project, {
      name: `${project.name} - Team Planning`,
      participants: teamUsers,
      purpose: 'planning',
      autoLink: true
    });
    conversations.push(teamConv.conversation);

    // If it's a design project, create review conversation
    if (project.metadata.serviceCategory === 'design-concepts' ||
        project.metadata.serviceCategory === 'visual-production') {
      const reviewConv = await this.createProjectConversation(project, {
        name: `${project.name} - Design Review`,
        participants: [...clientUsers, ...teamUsers],
        purpose: 'review',
        autoLink: true
      });
      conversations.push(reviewConv.conversation);
    }

    return conversations;
  }

  /**
   * Generate contextual conversation suggestions
   */
  getConversationSuggestions(project: Project): Array<{
    purpose: string;
    name: string;
    description: string;
    participants: string[];
    priority: 'high' | 'medium' | 'low';
  }> {
    const suggestions = [];

    const existingLinks = this.getProjectConversations(project.id);
    const existingPurposes = existingLinks.map(link => link.metadata?.purpose).filter(Boolean);

    // Suggest missing essential conversations
    if (!existingPurposes.includes('client-communication')) {
      suggestions.push({
        purpose: 'client-communication',
        name: `${project.name} - Client Updates`,
        description: 'Direct communication channel with the client for updates and feedback',
        participants: [], // Would be populated with actual client IDs
        priority: 'high' as const
      });
    }

    if (!existingPurposes.includes('review') &&
        (project.metadata.serviceCategory === 'design-concepts' ||
         project.metadata.serviceCategory === 'visual-production')) {
      suggestions.push({
        purpose: 'review',
        name: `${project.name} - Design Review`,
        description: 'Collaborative space for design feedback and approvals',
        participants: [],
        priority: 'high' as const
      });
    }

    if (!existingPurposes.includes('planning')) {
      suggestions.push({
        purpose: 'planning',
        name: `${project.name} - Internal Planning`,
        description: 'Team coordination and internal project planning',
        participants: [],
        priority: 'medium' as const
      });
    }

    return suggestions;
  }

  /**
   * Handle project status changes and update related conversations
   */
  async handleProjectStatusChange(
    project: Project,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const links = this.getProjectConversations(project.id);

    for (const link of links) {
      // Send status update message to each conversation
      const statusMessage = this.generateStatusChangeMessage(project.name, oldStatus, newStatus);

      await messagingService.sendMessage({
        conversationId: link.conversationId,
        type: 'system',
        content: statusMessage,
        metadata: {
          projectId: project.id,
          messageType: 'status-update',
          oldStatus,
          newStatus
        }
      });
    }

    // Add to project activity
    this.addProjectActivity({
      id: `activity-${Date.now()}`,
      projectId: project.id,
      type: 'milestone_reached',
      title: 'Project Status Updated',
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      userId: 'system',
      userName: 'System',
      timestamp: new Date(),
      metadata: { oldStatus, newStatus }
    });
  }

  // Private helper methods
  private addProjectConversationLink(link: ProjectConversationLink): void {
    const existingLinks = this.links.get(link.projectId) || [];
    existingLinks.push(link);
    this.links.set(link.projectId, existingLinks);
    this.conversationProjects.set(link.conversationId, link.projectId);
  }

  private addProjectActivity(activity: ProjectActivity): void {
    const existingActivities = this.projectActivities.get(activity.projectId) || [];
    existingActivities.unshift(activity); // Add to beginning for chronological order
    this.projectActivities.set(activity.projectId, existingActivities.slice(0, 100)); // Keep last 100 activities
  }

  private generateConversationName(project: Project, purpose?: string): string {
    const purposePrefix = {
      'general': '',
      'review': 'Review - ',
      'planning': 'Planning - ',
      'client-communication': 'Client - '
    };

    return `${purposePrefix[purpose as keyof typeof purposePrefix] || ''}${project.name}`;
  }

  private generateConversationDescription(project: Project, purpose?: string): string {
    const purposeDesc = {
      'general': 'General project discussion and coordination',
      'review': 'Design review, feedback, and approval workflow',
      'planning': 'Internal planning and team coordination',
      'client-communication': 'Direct communication with client for updates and feedback'
    };

    return purposeDesc[purpose as keyof typeof purposeDesc] ||
           `Project conversation for ${project.name}`;
  }

  private getMessageTitle(type?: string): string {
    const titles = {
      'update': 'Project Update',
      'question': 'Question Posted',
      'review-request': 'Review Requested',
      'milestone': 'Milestone Update',
      'file-share': 'File Shared'
    };

    return titles[type as keyof typeof titles] || 'Message Sent';
  }

  private generateStatusChangeMessage(projectName: string, oldStatus: string, newStatus: string): string {
    return `🎯 **Project Status Update**\n\n${projectName} status has been updated from **${oldStatus}** to **${newStatus}**.`;
  }
}

// Export singleton instance
export const projectMessagingIntegration = new ProjectMessagingIntegrationService();
export default projectMessagingIntegration;