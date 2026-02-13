/**
 * Integration Types
 * Type definitions for OAuth integrations (Figma, Slack, GitHub)
 */

export type IntegrationProvider = 'figma' | 'slack' | 'github';

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  userId: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  connectedAt: string;
  expiresAt?: string;
  lastUsed?: string;
  metadata?: Record<string, unknown>;
}

export interface OAuthError {
  code: 'POPUP_BLOCKED' | 'AUTHORIZATION_DENIED' | 'NETWORK_ERROR' | 'TOKEN_EXPIRED' | 'UNKNOWN';
  message: string;
  details?: unknown;
}

export interface OAuthState {
  isConnecting: boolean;
  isConnected: boolean;
  error: OAuthError | null;
  integration: Integration | null;
}

export interface FigmaIntegration extends Integration {
  provider: 'figma';
  metadata: {
    userId: string;
    email: string;
    handle: string;
    avatarUrl?: string;
  };
}

export interface SlackWorkspace {
  id: string;
  teamId: string;
  teamName: string;
  teamDomain: string;
  teamIcon?: string;
  botUserId: string;
  scope: string;
  connectedAt: string;
  lastUsed?: string;
}

export interface SlackIntegration extends Integration {
  provider: 'slack';
  metadata: {
    workspaces: SlackWorkspace[];
  };
}

export interface GitHubIntegration extends Integration {
  provider: 'github';
  metadata: {
    login: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface IntegrationPermission {
  name: string;
  description: string;
  granted: boolean;
}

export interface IntegrationConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  color: string;
  permissions: IntegrationPermission[];
  features: string[];
}

export const INTEGRATION_CONFIGS: Record<IntegrationProvider, IntegrationConfig> = {
  figma: {
    provider: 'figma',
    name: 'Figma',
    description: 'Import designs, components, and collaborate on design files',
    icon: 'Figma',
    color: '#F24E1E',
    permissions: [
      {
        name: 'Read Files',
        description: 'Access your Figma files and projects',
        granted: true
      },
      {
        name: 'Read Comments',
        description: 'View comments and feedback on designs',
        granted: true
      }
    ],
    features: [
      'Import design files directly into projects',
      'Extract components and design tokens',
      'Sync design updates automatically',
      'View and respond to design comments'
    ]
  },
  slack: {
    provider: 'slack',
    name: 'Slack',
    description: 'Send notifications, updates, and collaborate with your team',
    icon: 'MessageSquare',
    color: '#4A154B',
    permissions: [
      {
        name: 'Send Messages',
        description: 'Post messages to channels and DMs',
        granted: true
      },
      {
        name: 'Read Channels',
        description: 'View channel lists and information',
        granted: true
      },
      {
        name: 'Manage Conversations',
        description: 'Create and manage conversations',
        granted: true
      }
    ],
    features: [
      'Send project updates to Slack channels',
      'Get notified about task assignments',
      'Share files and assets directly',
      'Create tasks from Slack messages'
    ]
  },
  github: {
    provider: 'github',
    name: 'GitHub',
    description: 'Connect repositories, track issues, and manage code',
    icon: 'Github',
    color: '#24292e',
    permissions: [
      {
        name: 'Read Repositories',
        description: 'Access repository information',
        granted: true
      },
      {
        name: 'Read Issues',
        description: 'View issues and pull requests',
        granted: true
      },
      {
        name: 'Write Issues',
        description: 'Create and update issues',
        granted: true
      }
    ],
    features: [
      'Link projects to GitHub repositories',
      'Sync issues with FluxStudio tasks',
      'Track commit history and branches',
      'Create pull requests from tasks'
    ]
  }
};
