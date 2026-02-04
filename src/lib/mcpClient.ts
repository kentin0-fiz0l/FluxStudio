/**
 * MCP WebSocket Client for Flux Studio
 * Communicates with the Flux MCP server for build management
 */

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface PreviewResult {
  run_id: number;
  status: string;
  html_url: string;
  created_at: string;
  head_branch: string;
}

export class MCPClient {
  private ws: WebSocket | null = null;
  private url: string;
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReconnecting = false;
  private authToken: string | null = null;

  constructor(url?: string, authToken?: string) {
    this.url = url || import.meta.env.VITE_MCP_WS_URL || 'ws://localhost:8787/mcp';
    this.authToken = authToken || import.meta.env.VITE_MCP_AUTH_TOKEN || null;
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Build URL with auth token
      let connectionUrl = this.url;
      if (this.authToken) {
        const separator = this.url.includes('?') ? '&' : '?';
        connectionUrl = `${this.url}${separator}token=${this.authToken}`;
      }

      console.log(`[MCP Client] Connecting to MCP server...`);

      this.ws = new WebSocket(connectionUrl);

      this.ws.onopen = () => {
        console.log('[MCP Client] Connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('[MCP Client] Connection error:', error);
        reject(new Error('Failed to connect to MCP server'));
      };

      this.ws.onmessage = (event) => {
        try {
          const response: MCPResponse = JSON.parse(event.data);
          const pending = this.pendingRequests.get(response.id);

          if (pending) {
            clearTimeout(pending.timeout); // Clear timeout on response
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
            this.pendingRequests.delete(response.id);
          }
        } catch (error) {
          console.error('[MCP Client] Failed to parse response:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[MCP Client] Disconnected');
        this.handleReconnect();
      };
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect() {
    if (this.isReconnecting) return; // Prevent multiple reconnection attempts

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`[MCP Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.isReconnecting = false;
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('[MCP Client] Max reconnection attempts reached');
      // Reject all pending requests
      for (const [_id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Connection lost'));
      }
      this.pendingRequests.clear();
    }
  }

  /**
   * Send request to MCP server
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout

      // Store request with timeout
      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.ws!.send(JSON.stringify(request));
    });
  }

  /**
   * Create a preview deployment for a branch
   */
  async createPreview(branch: string, payload?: Record<string, any>): Promise<PreviewResult> {
    console.log(`[MCP Client] Creating preview for branch: ${branch}`);

    const result = await this.sendRequest('tools/call', {
      name: 'builds.createPreview',
      arguments: {
        branch,
        payload,
      },
    });

    // Parse the text content from MCP response
    if (result.content && result.content[0]?.text) {
      return JSON.parse(result.content[0].text);
    }

    throw new Error('Invalid response format from MCP server');
  }

  /**
   * Tail logs for a workflow run
   */
  async tailLogs(runId: number): Promise<string> {
    console.log(`[MCP Client] Fetching logs for run: ${runId}`);

    const result = await this.sendRequest('tools/call', {
      name: 'builds.tailLogs',
      arguments: {
        run_id: runId,
      },
    });

    // Return the formatted text from MCP response
    if (result.content && result.content[0]?.text) {
      return result.content[0].text;
    }

    throw new Error('Invalid response format from MCP server');
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Clear all pending requests with their timeouts
    for (const [_id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();
    this.isReconnecting = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let mcpClient: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClient) {
    mcpClient = new MCPClient();
  }
  return mcpClient;
}
