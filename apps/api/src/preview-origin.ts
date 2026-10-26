import { networkInterfaces } from 'node:os';

function lanHosts(): string[] {
  const hosts: string[] = [];
  let nets: ReturnType<typeof networkInterfaces>;
  try {
    nets = networkInterfaces();
  } catch {
    return hosts;
  }
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        hosts.push(entry.address);
      }
    }
  }
  return hosts;
}

function allowedHosts(): Set<string> {
  return new Set(['127.0.0.1', 'localhost', ...lanHosts()]);
}

// The web preview is a different origin from the API. Its port moves when
// 3000 is taken, and a device on the LAN opens this machine's address.
export function previewOriginAllowed(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' || url.origin !== origin) {
    return false;
  }
  return allowedHosts().has(url.hostname);
}

export function trustedPreviewOrigins(): string[] {
  return [...allowedHosts()].map((host) => `http://${host}:*`);
}
