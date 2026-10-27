import { networkInterfaces } from 'node:os';

export type AuthConfig =
  | {
      mode: 'development';
      secret: string;
      baseURL: string;
      allowedHosts: string[];
      appURL: string;
    }
  | {
      mode: 'production';
      secret: string;
      baseURL: string;
      allowedOrigins: string[];
      appURL: string;
    };

const devSecret = 'dev-secret-dev-secret-dev-secret';
const minProductionSecretLength = 32;
const devAppPort = 3000;

function discoverLanHosts(): string[] {
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

export function advertisedHost(): string {
  return discoverLanHosts()[0] ?? '127.0.0.1';
}

function isExactHttpsOrigin(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.origin === value;
}

function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseProductionConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET must be set in production.');
  }
  if (secret.length < minProductionSecretLength) {
    throw new Error(
      `BETTER_AUTH_SECRET must be at least ${minProductionSecretLength} characters in production.`,
    );
  }
  const baseURL = env.BETTER_AUTH_URL;
  if (!baseURL) {
    throw new Error('BETTER_AUTH_URL must be set in production.');
  }
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS ?? '');
  if (allowedOrigins.length === 0) {
    throw new Error(
      'ALLOWED_ORIGINS must list at least one https origin in production.',
    );
  }
  const insecure = allowedOrigins.find((origin) => !isExactHttpsOrigin(origin));
  if (insecure) {
    throw new Error(
      `ALLOWED_ORIGINS must list only exact https origins, got "${insecure}".`,
    );
  }
  const appURL = env.APP_URL;
  if (!appURL) {
    throw new Error('APP_URL must be set in production.');
  }
  if (!isExactHttpsOrigin(appURL)) {
    throw new Error(`APP_URL must be an exact https origin, got "${appURL}".`);
  }
  return { mode: 'production', secret, baseURL, allowedOrigins, appURL };
}

function defaultDevAppURL(host: string): string {
  return `http://${host}:${devAppPort}/__web_preview?casename=main.web.bundle`;
}

function parseDevelopmentConfig(
  env: NodeJS.ProcessEnv,
  lanHosts: string[],
): AuthConfig {
  const secret = env.BETTER_AUTH_SECRET ?? devSecret;
  const allowedHosts = ['127.0.0.1', 'localhost', ...lanHosts];
  const port = env.PORT ?? '3001';
  const host = lanHosts[0] ?? '127.0.0.1';
  const baseURL = env.BETTER_AUTH_URL ?? `http://${host}:${port}`;
  const appURL = env.APP_URL ?? defaultDevAppURL(host);
  return { mode: 'development', secret, baseURL, allowedHosts, appURL };
}

export function parseAuthConfig(
  env: NodeJS.ProcessEnv,
  lanHosts: string[] = discoverLanHosts(),
): AuthConfig {
  if (env.NODE_ENV === 'production') {
    return parseProductionConfig(env);
  }
  return parseDevelopmentConfig(env, lanHosts);
}

export function isOriginAllowed(config: AuthConfig, origin: string): boolean {
  switch (config.mode) {
    case 'development': {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        return false;
      }
      if (url.protocol !== 'http:' || url.origin !== origin) {
        return false;
      }
      return config.allowedHosts.includes(url.hostname);
    }
    case 'production':
      return config.allowedOrigins.includes(origin);
    default: {
      const unreachable: never = config;
      return unreachable;
    }
  }
}

export function trustedOrigins(config: AuthConfig): string[] {
  switch (config.mode) {
    case 'development':
      return config.allowedHosts.map((host) => `http://${host}:*`);
    case 'production':
      return config.allowedOrigins;
    default: {
      const unreachable: never = config;
      return unreachable;
    }
  }
}

export const authConfig: AuthConfig = parseAuthConfig(process.env);
