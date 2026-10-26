import { type ChildProcess, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const apiPort = process.env.PORT ?? '3001';

function lanAddress(): string {
  const nets = networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return '127.0.0.1';
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
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

await run('docker', ['compose', 'up', '-d', '--wait'], repoRoot);

const apiBase = `http://${lanAddress()}:${apiPort}`;
const sharedEnv = {
  ...process.env,
  PORT: apiPort,
  API_BASE: apiBase,
  DATABASE_URL: 'postgres://reviews:reviews@127.0.0.1:5432/reviews',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
};

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
