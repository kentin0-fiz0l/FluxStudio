/**
 * Slack Service
 * Integration with Slack API for team notifications and messaging
 *
 * Features:
 * - OAuth authentication
 * - Channel messaging
 * - Webhook notifications for project updates
 * - Interactive message components
 * - File sharing
 */

import { WebClient, Block, KnownBlock, MessageAttachment } from '@slack/web-api';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  is_member: boolean;
}

export type SlackBlock = Block | KnownBlock;

export interface SlackMessage {
  channel: string;
  ts: string;
  text?: string;
  blocks?: SlackBlock[];
  user?: string;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    email?: string;
    image_512?: string;
  };
}

export interface SlackWebhookEvent {
  channel?: string;
  user?: string;
  type?: string;
  text?: string;
  ts?: string;
}

export interface SlackWebhookPayload {
  type: string;
  team_id?: string;
  event?: SlackWebhookEvent;
  challenge?: string;
}

export interface SlackWebhook {
  type: string;
  team_id: string;
  channel_id?: string;
  user_id?: string;
  event?: SlackWebhookEvent;
  challenge?: string;
}

export interface SlackAuthTestResult {
  ok: boolean;
  url?: string;
  team?: string;
  user?: string;
  team_id?: string;
  user_id?: string;
}

export interface SlackUpdateResult {
  ok: boolean;
  channel?: string;
  ts?: string;
  text?: string;
}

export interface SlackDeleteResult {
  ok: boolean;
  channel?: string;
  ts?: string;
}

export interface SlackFileUploadResult {
  ok: boolean;
  file?: {
    id: string;
    name: string;
    url_private?: string;
  };
}

interface SlackError extends Error {
  code?: string;
  data?: unknown;
}

class SlackService {
  private client: WebClient | null = null;

  constructor(accessToken?: string) {
    if (accessToken) {
      this.setAccessToken(accessToken);
    }
  }

  /**
   * Set access token for authenticated requests
   * @param accessToken - Slack OAuth access token
   */
  setAccessToken(accessToken: string): void {
    this.client = new WebClient(accessToken);
  }

  /**
   * Test authentication
   * @returns Authentication test result
   */
  async testAuth(): Promise<SlackAuthTestResult> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Set access token first.');
    }

    try {
      const result = await this.client.auth.test();
      return result as SlackAuthTestResult;
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Slack auth test failed: ${slackError.message}`);
    }
  }

  /**
   * Get list of channels
   * @param includePrivate - Include private channels
   * @returns List of channels
   */
  async listChannels(includePrivate: boolean = false): Promise<SlackChannel[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.conversations.list({
        types: includePrivate ? 'public_channel,private_channel' : 'public_channel',
        exclude_archived: true
      });

      interface ChannelResponse {
        id?: string;
        name?: string;
        is_private?: boolean;
        is_archived?: boolean;
        is_member?: boolean;
      }

      return (result.channels as ChannelResponse[] | undefined)?.map(channel => ({
        id: channel.id || '',
        name: channel.name || '',
        is_private: channel.is_private || false,
        is_archived: channel.is_archived || false,
        is_member: channel.is_member || false
      })) || [];
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to list Slack channels: ${slackError.message}`);
    }
  }

  /**
   * Post a message to a channel
   * @param channel - Channel ID or name
   * @param text - Message text
   * @param options - Additional message options
   * @returns Message result
   */
  async postMessage(
    channel: string,
    text: string,
    options: {
      blocks?: SlackBlock[];
      thread_ts?: string;
      reply_broadcast?: boolean;
      attachments?: MessageAttachment[];
    } = {}
  ): Promise<SlackMessage> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        ...options
      });

      return {
        channel: result.channel as string,
        ts: result.ts as string,
        text: result.message?.text,
        blocks: result.message?.blocks as SlackBlock[] | undefined,
        user: result.message?.user
      };
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to post Slack message: ${slackError.message}`);
    }
  }

  /**
   * Post a rich message with blocks (interactive components)
   * @param channel - Channel ID
   * @param blocks - Slack Block Kit blocks
   * @param text - Fallback text
   * @returns Message result
   */
  async postRichMessage(channel: string, blocks: SlackBlock[], text: string = 'New message'): Promise<SlackMessage> {
    return this.postMessage(channel, text, { blocks });
  }

  /**
   * Update an existing message
   * @param channel - Channel ID
   * @param ts - Message timestamp
   * @param text - New text
   * @param options - Additional options
   * @returns Update result
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    options: {
      blocks?: SlackBlock[];
    } = {}
  ): Promise<SlackUpdateResult> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.chat.update({
        channel,
        ts,
        text,
        ...options
      });

      return result as SlackUpdateResult;
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to update Slack message: ${slackError.message}`);
    }
  }

  /**
   * Delete a message
   * @param channel - Channel ID
   * @param ts - Message timestamp
   * @returns Delete result
   */
  async deleteMessage(channel: string, ts: string): Promise<SlackDeleteResult> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.chat.delete({
        channel,
        ts
      });

      return result as SlackDeleteResult;
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to delete Slack message: ${slackError.message}`);
    }
  }

  /**
   * Get channel history
   * @param channel - Channel ID
   * @param limit - Number of messages to retrieve
   * @returns Channel messages
   */
  async getChannelHistory(channel: string, limit: number = 100): Promise<SlackMessage[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.conversations.history({
        channel,
        limit
      });

      interface MessageResponse {
        ts?: string;
        text?: string;
        blocks?: SlackBlock[];
        user?: string;
      }

      return (result.messages as MessageResponse[] | undefined)?.map(message => ({
        channel,
        ts: message.ts || '',
        text: message.text,
        blocks: message.blocks,
        user: message.user
      })) || [];
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to get Slack channel history: ${slackError.message}`);
    }
  }

  /**
   * Upload a file to Slack
   * @param channels - Channel IDs (comma-separated)
   * @param file - File buffer or stream
   * @param filename - File name
   * @param options - Additional options
   * @returns Upload result
   */
  async uploadFile(
    channels: string,
    file: Buffer | NodeJS.ReadableStream,
    filename: string,
    options: {
      title?: string;
      initial_comment?: string;
    } = {}
  ): Promise<SlackFileUploadResult> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.files.uploadV2({
        channels,
        file,
        filename,
        ...options
      });

      return result as unknown as SlackFileUploadResult;
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to upload file to Slack: ${slackError.message}`);
    }
  }

  /**
   * Get user info
   * @param userId - User ID
   * @returns User information
   */
  async getUserInfo(userId: string): Promise<SlackUser> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }

    try {
      const result = await this.client.users.info({ user: userId });

      return {
        id: result.user?.id || '',
        name: result.user?.name || '',
        real_name: result.user?.real_name,
        profile: result.user?.profile as { email?: string; image_512?: string } | undefined
      };
    } catch (error) {
      const slackError = error as SlackError;
      throw new Error(`Failed to get Slack user info: ${slackError.message}`);
    }
  }

  /**
   * Send project update notification
   * @param channel - Channel ID
   * @param projectName - Project name
   * @param updateType - Type of update
   * @param details - Update details
   * @returns Message result
   */
  async sendProjectUpdate(
    channel: string,
    projectName: string,
    updateType: 'created' | 'updated' | 'completed' | 'archived',
    details: string
  ): Promise<SlackMessage> {
    const emoji = {
      created: '🎨',
      updated: '📝',
      completed: '✅',
      archived: '📁'
    }[updateType];

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Project ${updateType.charAt(0).toUpperCase() + updateType.slice(1)}: ${projectName}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: details
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*FluxStudio* · ${new Date().toLocaleString()}`
          }
        ]
      }
    ];

    return this.postRichMessage(channel, blocks, `Project ${updateType}: ${projectName}`);
  }

  /**
   * Send task notification
   * @param channel - Channel ID
   * @param taskTitle - Task title
   * @param assignee - Assignee name
   * @param dueDate - Due date
   * @returns Message result
   */
  async sendTaskNotification(
    channel: string,
    taskTitle: string,
    assignee: string,
    dueDate?: string
  ): Promise<SlackMessage> {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📋 *New Task Assigned*\n*${taskTitle}*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Assigned to:*\n${assignee}`
          },
          ...(dueDate ? [{
            type: 'mrkdwn',
            text: `*Due Date:*\n${dueDate}`
          }] : [])
        ]
      }
    ];

    return this.postRichMessage(channel, blocks, `New task assigned: ${taskTitle}`);
  }

  /**
   * Verify Slack webhook signature
   * @param signingSecret - Slack signing secret
   * @param timestamp - X-Slack-Request-Timestamp header
   * @param body - Request body string
   * @param signature - X-Slack-Signature header
   * @returns True if valid
   */
  static verifyWebhookSignature(
    signingSecret: string,
    timestamp: string,
    body: string,
    signature: string
  ): boolean {
    const crypto = require('crypto');

    // Check if timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
      return false;
    }

    // Create signature
    const sig_basestring = `v0:${timestamp}:${body}`;
    const my_signature = 'v0=' + crypto
      .createHmac('sha256', signingSecret)
      .update(sig_basestring)
      .digest('hex');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(my_signature),
      Buffer.from(signature)
    );
  }

  /**
   * Parse Slack webhook event
   * @param payload - Webhook payload
   * @returns Parsed event
   */
  static parseWebhook(payload: SlackWebhookPayload): SlackWebhook {
    return {
      type: payload.type,
      team_id: payload.team_id || '',
      channel_id: payload.event?.channel,
      user_id: payload.event?.user,
      event: payload.event,
      challenge: payload.challenge
    };
  }

  /**
   * Handle Slack URL verification challenge
   * @param payload - Webhook payload
   * @returns Challenge response or null
   */
  static handleChallenge(payload: SlackWebhookPayload): string | null {
    if (payload.type === 'url_verification' && payload.challenge) {
      return payload.challenge;
    }
    return null;
  }
}

export default SlackService;
