const steps = ['bun run check', 'bun run typecheck', 'bun run test'] as const;

for (const step of steps) {
  const child = Bun.spawn(step.split(' '), {
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
  const code = await child.exited;
  if (code !== 0) {
    process.exit(code);
  }
}
