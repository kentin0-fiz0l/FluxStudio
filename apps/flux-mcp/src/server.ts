/**
 * Flux Studio MCP Server
 * Exposes GitHub Actions workflow management via Model Context Protocol
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import 'dotenv/config';
import { GitHubClient } from './github.js';
import { CreatePreviewInputSchema, TailLogsInputSchema } from './schema.js';

const PORT = parseInt(process.env.PORT || '8787', 10);
const USE_WEBSOCKET = process.env.TRANSPORT !== 'stdio';

// Initialize GitHub client
const github = new GitHubClient();

// Create MCP server
const server = new Server(
  {
    name: '@flux/mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'builds.createPreview',
        description: 'Trigger a preview deployment workflow for a specific Git branch. Returns run ID, status, and preview URL.',
        inputSchema: {
          type: 'object',
          properties: {
            branch: {
              type: 'string',
              description: 'Git branch name to deploy (e.g., "feat/new-feature")',
            },
            payload: {
              type: 'object',
              description: 'Optional workflow dispatch inputs (JSON object)',
              additionalProperties: true,
            },
          },
          required: ['branch'],
        },
      },
      {
        name: 'builds.tailLogs',
        description: 'Get status and logs information for a specific workflow run. Returns formatted run details with links.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'GitHub Actions workflow run ID',
            },
          },
          required: ['run_id'],
        },
      },
    ],
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'builds.createPreview': {
        // Validate inputs
        const validatedArgs = CreatePreviewInputSchema.parse(args);

        console.log(`[MCP] Creating preview for branch: ${validatedArgs.branch}`);

        // Call GitHub API
        const result = await github.createPreview(
          validatedArgs.branch,
          validatedArgs.payload
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'builds.tailLogs': {
        // Validate inputs
        const validatedArgs = TailLogsInputSchema.parse(args);

        console.log(`[MCP] Fetching logs for run: ${validatedArgs.run_id}`);

        // Call GitHub API
        const result = await github.tailLogs(validatedArgs.run_id);
        const formatted = github.formatLogsResponse(result);

        return {
          content: [
            {
              type: 'text',
              text: formatted,
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MCP] Tool execution error:`, errorMessage);

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${errorMessage}`
    );
  }
});

// Start server
async function main() {
  if (USE_WEBSOCKET) {
    // WebSocket transport for remote connections
    console.log(`[MCP] Starting WebSocket server on port ${PORT}...`);

    const httpServer = createServer((req, res) => {
      // Health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'flux-mcp',
          version: '1.0.0'
        }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    const wss = new WebSocketServer({
      server: httpServer,
      path: '/mcp',
    });

    wss.on('connection', (ws) => {
      console.log('[MCP] Client connected');

      const transport = {
        async start() {
          // Connection already established
        },
        async send(message: any) {
          ws.send(JSON.stringify(message));
        },
        async close() {
          ws.close();
        },
        onmessage: null as ((message: any) => void) | null,
        onerror: null as ((error: Error) => void) | null,
        onclose: null as (() => void) | null,
      };

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (transport.onmessage) {
            transport.onmessage(message);
          }
        } catch (error) {
          console.error('[MCP] Failed to parse message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('[MCP] WebSocket error:', error);
        if (transport.onerror) {
          transport.onerror(error);
        }
      });

      ws.on('close', () => {
        console.log('[MCP] Client disconnected');
        if (transport.onclose) {
          transport.onclose();
        }
      });

      // Connect transport to MCP server
      server.connect(transport as any).catch((error) => {
        console.error('[MCP] Failed to connect transport:', error);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`✅ Flux MCP Server running on ws://localhost:${PORT}/mcp`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   GitHub: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[MCP] Shutting down...');
      httpServer.close(() => {
        process.exit(0);
      });
    });
  } else {
    // Stdio transport for local/direct connections
    console.error('[MCP] Starting stdio server...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Server connected via stdio');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('[MCP] Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('[MCP] Uncaught exception:', error);
  process.exit(1);
});

// Run
main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
