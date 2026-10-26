import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const appDir = join(repoRoot, 'apps/app');

const bundlePath = join(appDir, 'dist/main.lynx.bundle');

function runBuild(compiler: 'on' | 'off'): Promise<number> {
  const started = performance.now();
  const env = { ...process.env };
  env.REACT_COMPILER = compiler === 'off' ? '0' : '1';

  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', 'build'], {
      cwd: appDir,
      env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(Math.round(performance.now() - started));
        return;
      }
      reject(new Error(`rsbuild build (${compiler}) exited ${code}`));
    });
  });
}

async function warm(compiler: 'on' | 'off'): Promise<{
  ms: number;
  bytes: number;
}> {
  await runBuild(compiler);
  const ms = await runBuild(compiler);
  return { ms, bytes: statSync(bundlePath).size };
}

const off = await warm('off');
const on = await warm('on');
const out = join(repoRoot, 'docs/compiler-first-frame.md');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `# Compiler first frame

\`engineVersion\` is 3.9. The published encoder only accepts Lynx 1.0 through 3.9, so 4.1 does not build. Raise it when a compiler that can emit 4.1 is published, and keep the host SDK at or above that value.

Device IFR was not measured. No Lynx Explorer host was attached, so there is no on-device first-frame sample for the compiler on versus off.

The numbers below are the second app build of each setting in \`apps/app\`, after one throwaway build so the toolchain is warm. That is the cost of running the compiler during the bundle step. It is not a first-frame time. Bundle size is the output of that second build.

| Compiler | Warm build | Bundle |
| --- | --- | --- |
| off (\`REACT_COMPILER=0\`) | ${off.ms} ms | ${off.bytes} bytes |
| on | ${on.ms} ms | ${on.bytes} bytes |

Re-run with \`bun scripts/measure-compiler.ts\`. Replace this note with a device trace before turning the compiler off on the entry screen.
`,
);

console.log(
  `recorded compiler off ${off.ms} ms / ${off.bytes} bytes, on ${on.ms} ms / ${on.bytes} bytes`,
);
