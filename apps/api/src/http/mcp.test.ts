import { describe, expect, test } from 'bun:test';
import {
  demoAgentToken,
  demoMembership,
} from '../contexts/identity/domain/demo';
import { seedDemo } from '../contexts/identity/infra/seed';
import { migrateDatabase } from '../migrate';
import { app } from './app';

async function rpc(method: string, params?: Record<string, unknown>) {
  const response = await app.request('http://127.0.0.1:3001/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${demoAgentToken}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });
  return { status: response.status, body: await response.text() };
}

describe('mcp whoami', () => {
  test('lists whoami and returns the demo membership', async () => {
    await migrateDatabase();
    await seedDemo();

    const listed = await rpc('tools/list');
    expect(listed.status).toBe(200);
    expect(listed.body).toContain('whoami');

    const called = await rpc('tools/call', { name: 'whoami', arguments: {} });
    expect(called.status).toBe(200);
    expect(called.body).toContain(demoMembership.id);
    expect(called.body).toContain(demoMembership.companyId);
  });
});
