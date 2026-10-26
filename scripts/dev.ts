import { type ChildProcess, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advertisedHost } from '../apps/api/src/preview-origin';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const apiPort = process.env.PORT ?? '3001';
const hosted = `http://${advertisedHost()}:${apiPort}`;

function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function start(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): ChildProcess {
  return spawn(command, args, { cwd, env, stdio: 'inherit' });
}

const sharedEnv = {
  ...process.env,
  PORT: apiPort,
  API_BASE: hosted,
  DATABASE_URL: 'postgres://reviews:reviews@127.0.0.1:5432/reviews',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  MAILPIT_URL: 'http://127.0.0.1:8025',
  BETTER_AUTH_SECRET: 'dev-secret-dev-secret-dev-secret',
  BETTER_AUTH_URL: hosted,
};

await run('docker', ['compose', 'up', '-d', '--wait'], repoRoot, sharedEnv);
await run('bun', ['src/migrate.ts'], join(repoRoot, 'apps/api'), sharedEnv);
await run('bun', ['src/seed.ts'], join(repoRoot, 'apps/api'), sharedEnv);

const api = start(
  'bun',
  ['--watch', 'src/server.ts'],
  join(repoRoot, 'apps/api'),
  sharedEnv,
);
const app = start('bun', ['run', 'dev'], join(repoRoot, 'apps/app'), sharedEnv);

let stopping = false;

function stop(code: number) {
  if (stopping) {
    return;
  }
  stopping = true;
  api.kill('SIGTERM');
  app.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGINT', () => {
  stop(0);
});
process.on('SIGTERM', () => {
  stop(0);
});

api.on('exit', () => {
  stop(1);
});
app.on('exit', () => {
  stop(1);
});
