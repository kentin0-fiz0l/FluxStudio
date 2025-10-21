/**
 * Figma Service
 * Integration with Figma API for design file management
 *
 * Features:
 * - OAuth authentication
 * - File browsing and import
 * - Comment synchronization
 * - Webhook notifications for file updates
 * - Version history tracking
 */

import axios, { AxiosInstance } from 'axios';

interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
  version: string;
}

interface FigmaComment {
  id: string;
  message: string;
  client_meta?: any;
  created_at: string;
  user: {
    handle: string;
    img_url?: string;
  };
}

interface FigmaTeamProject {
  id: string;
  name: string;
}

interface FigmaWebhook {
  team_id: string;
  event_type: 'FILE_UPDATE' | 'FILE_COMMENT' | 'FILE_VERSION_UPDATE';
  file_key: string;
  file_name: string;
  timestamp: string;
  triggered_by: {
    id: string;
    handle: string;
  };
}

class FigmaService {
  private baseURL = 'https://api.figma.com/v1';
  private axiosInstance: AxiosInstance;

  constructor(accessToken?: string) {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: accessToken ? {
        'X-Figma-Token': accessToken,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Set access token for authenticated requests
   * @param accessToken - Figma OAuth access token
   */
  setAccessToken(accessToken: string): void {
    this.axiosInstance.defaults.headers['X-Figma-Token'] = accessToken;
  }

  /**
   * Get current user info
   * @returns User information
   */
  async getMe(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/me');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma user info: ${error.message}`);
    }
  }

  /**
   * Get file by key
   * @param fileKey - Figma file key
   * @returns File data
   */
  async getFile(fileKey: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileKey}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma file: ${error.message}`);
    }
  }

  /**
   * Get file nodes (specific components)
   * @param fileKey - Figma file key
   * @param nodeIds - Array of node IDs
   * @returns Node data
   */
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<any> {
    try {
      const ids = nodeIds.join(',');
      const response = await this.axiosInstance.get(`/files/${fileKey}/nodes?ids=${ids}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma file nodes: ${error.message}`);
    }
  }

  /**
   * Get file images (rendered PNGs/JPGs/SVGs)
   * @param fileKey - Figma file key
   * @param nodeIds - Array of node IDs
   * @param options - Rendering options (format, scale, etc.)
   * @returns Image URLs
   */
  async getFileImages(
    fileKey: string,
    nodeIds: string[],
    options: {
      format?: 'png' | 'jpg' | 'svg' | 'pdf';
      scale?: number;
      svg_include_id?: boolean;
    } = {}
  ): Promise<{ images: Record<string, string> }> {
    try {
      const params = new URLSearchParams({
        ids: nodeIds.join(','),
        format: options.format || 'png',
        scale: (options.scale || 1).toString()
      });

      if (options.svg_include_id) {
        params.append('svg_include_id', 'true');
      }

      const response = await this.axiosInstance.get(`/images/${fileKey}?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma file images: ${error.message}`);
    }
  }

  /**
   * Get comments on a file
   * @param fileKey - Figma file key
   * @returns List of comments
   */
  async getComments(fileKey: string): Promise<FigmaComment[]> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileKey}/comments`);
      return response.data.comments || [];
    } catch (error: any) {
      throw new Error(`Failed to get Figma comments: ${error.message}`);
    }
  }

  /**
   * Post a comment on a file
   * @param fileKey - Figma file key
   * @param message - Comment message
   * @param client_meta - Optional metadata (position, etc.)
   * @returns Created comment
   */
  async postComment(fileKey: string, message: string, client_meta?: any): Promise<FigmaComment> {
    try {
      const response = await this.axiosInstance.post(`/files/${fileKey}/comments`, {
        message,
        client_meta
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to post Figma comment: ${error.message}`);
    }
  }

  /**
   * Get team projects
   * @param teamId - Team ID
   * @returns List of projects
   */
  async getTeamProjects(teamId: string): Promise<FigmaTeamProject[]> {
    try {
      const response = await this.axiosInstance.get(`/teams/${teamId}/projects`);
      return response.data.projects || [];
    } catch (error: any) {
      throw new Error(`Failed to get Figma team projects: ${error.message}`);
    }
  }

  /**
   * Get project files
   * @param projectId - Project ID
   * @returns List of files
   */
  async getProjectFiles(projectId: string): Promise<FigmaFile[]> {
    try {
      const response = await this.axiosInstance.get(`/projects/${projectId}/files`);
      return response.data.files || [];
    } catch (error: any) {
      throw new Error(`Failed to get Figma project files: ${error.message}`);
    }
  }

  /**
   * Get file versions (version history)
   * @param fileKey - Figma file key
   * @returns List of file versions
   */
  async getFileVersions(fileKey: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileKey}/versions`);
      return response.data.versions || [];
    } catch (error: any) {
      throw new Error(`Failed to get Figma file versions: ${error.message}`);
    }
  }

  /**
   * Get component sets from a file
   * @param fileKey - Figma file key
   * @returns Component sets
   */
  async getComponentSets(fileKey: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileKey}/component_sets`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma component sets: ${error.message}`);
    }
  }

  /**
   * Get components from a file
   * @param fileKey - Figma file key
   * @returns Components
   */
  async getComponents(fileKey: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileKey}/components`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get Figma components: ${error.message}`);
    }
  }

  /**
   * Verify Figma webhook signature
   * @param payload - Webhook payload
   * @param signature - X-Figma-Signature header
   * @param secret - Webhook secret
   * @returns True if valid
   */
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature;
  }

  /**
   * Parse Figma webhook payload
   * @param payload - Webhook payload
   * @returns Parsed webhook data
   */
  static parseWebhook(payload: any): FigmaWebhook {
    return {
      team_id: payload.team_id,
      event_type: payload.event_type,
      file_key: payload.file_key,
      file_name: payload.file_name,
      timestamp: payload.timestamp,
      triggered_by: payload.triggered_by
    };
  }

  /**
   * Export Figma file to specific format
   * @param fileKey - Figma file key
   * @param format - Export format
   * @returns Export data
   */
  async exportFile(fileKey: string, format: 'pdf' | 'svg' | 'png' | 'jpg'): Promise<any> {
    try {
      // Get all top-level nodes
      const file = await this.getFile(fileKey);
      const nodeIds = file.document.children.map((child: any) => child.id);

      // Get images for all nodes
      const images = await this.getFileImages(fileKey, nodeIds, { format });

      return {
        fileKey,
        format,
        images: images.images,
        exportedAt: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Failed to export Figma file: ${error.message}`);
    }
  }
}

export default FigmaService;
