#!/usr/bin/env node

/**
 * Vikunja MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import dotenv from 'dotenv';

import { AuthManager } from './auth/AuthManager';
import { registerTools } from './tools';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize server
const server = new McpServer({
  name: 'vikunja-mcp',
  version: '0.1.0',
});

// Initialize auth manager
const authManager = new AuthManager();

// Export client functions from client module
export { getVikunjaClient, cleanupVikunjaClient } from './client';
import { setAuthManager } from './client';

// Set the auth manager in the client module
setAuthManager(authManager);

// Auto-authenticate using environment variables if available
if (process.env.VIKUNJA_URL && process.env.VIKUNJA_API_TOKEN) {
  logger.info(`Auto-authenticating with Vikunja at ${process.env.VIKUNJA_URL}`);
  authManager.connect(process.env.VIKUNJA_URL, process.env.VIKUNJA_API_TOKEN);
  const detectedAuthType = authManager.getAuthType();
  logger.info(`Using detected auth type: ${detectedAuthType}`);
}

// Register all tools
registerTools(server, authManager);

// Start the server
async function main(): Promise<void> {
  const mode = process.env.MCP_MODE || 'http';
  let transport;

  if (mode === 'stdio') {
    transport = new StdioServerTransport();
  } else {
    const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
    transport = new HttpServerTransport({ port });
  }

  await server.connect(transport);

  logger.info('Vikunja MCP server started');
  logger.debug('Configuration loaded', {
    mode,
    debug: process.env.DEBUG,
    hasAuth: !!process.env.VIKUNJA_URL && !!process.env.VIKUNJA_API_TOKEN,
  });
}

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  main().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}
