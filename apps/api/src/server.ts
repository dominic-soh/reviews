import { app } from './http/app';

const port = Number(process.env.PORT ?? 3001);

Bun.serve({
  hostname: '0.0.0.0',
  port,
  fetch: app.fetch,
});
