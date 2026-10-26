import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Hono } from 'hono';
import { companyActorForAgentToken } from '../application/company-actor';

function bearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

export const mcpRoutes = new Hono();

mcpRoutes.all('/mcp', async (c) => {
  const token = bearerToken(c.req.header('authorization'));
  if (!token) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const actor = await companyActorForAgentToken(token);
  if (!actor) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const server = new McpServer({ name: 'reviews', version: '0.0.0' });
  server.registerTool(
    'whoami',
    { description: 'The company actor bound to this agent token' },
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(actor) }],
    }),
  );

  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  const response = await transport.handleRequest(c);
  if (!response) {
    return c.body(null, 204);
  }
  return response;
});
