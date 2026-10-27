import { describe, expect, test } from 'bun:test';
import {
  isOriginAllowed,
  parseAuthConfig,
  trustedOrigins,
} from './auth-config';

const productionEnv = {
  NODE_ENV: 'production',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'https://api.reviews.example',
  ALLOWED_ORIGINS: 'https://reviews.example',
  APP_URL: 'https://app.reviews.example',
} as const;

describe('parseAuthConfig in production', () => {
  test('throws when BETTER_AUTH_SECRET is missing', () => {
    const env = { ...productionEnv, BETTER_AUTH_SECRET: undefined };
    expect(() => parseAuthConfig(env, [])).toThrow('BETTER_AUTH_SECRET');
  });

  test('throws when BETTER_AUTH_SECRET is shorter than 32 characters', () => {
    const env = { ...productionEnv, BETTER_AUTH_SECRET: 'a'.repeat(31) };
    expect(() => parseAuthConfig(env, [])).toThrow('BETTER_AUTH_SECRET');
  });

  test('throws when BETTER_AUTH_URL is missing', () => {
    const env = { ...productionEnv, BETTER_AUTH_URL: undefined };
    expect(() => parseAuthConfig(env, [])).toThrow('BETTER_AUTH_URL');
  });

  test('throws when ALLOWED_ORIGINS is missing', () => {
    const env = { ...productionEnv, ALLOWED_ORIGINS: undefined };
    expect(() => parseAuthConfig(env, [])).toThrow('ALLOWED_ORIGINS');
  });

  test('throws when ALLOWED_ORIGINS is empty', () => {
    const env = { ...productionEnv, ALLOWED_ORIGINS: '  ,  ,' };
    expect(() => parseAuthConfig(env, [])).toThrow('ALLOWED_ORIGINS');
  });

  test('throws when ALLOWED_ORIGINS contains a non-https origin', () => {
    const env = {
      ...productionEnv,
      ALLOWED_ORIGINS: 'https://reviews.example,http://192.168.1.42:3000',
    };
    expect(() => parseAuthConfig(env, [])).toThrow('ALLOWED_ORIGINS');
  });

  test('a valid config allows exactly the listed origins and rejects a LAN http origin', () => {
    const config = parseAuthConfig(productionEnv, []);
    expect(isOriginAllowed(config, 'https://reviews.example')).toBe(true);
    expect(isOriginAllowed(config, 'http://192.168.1.42:3000')).toBe(false);
    expect(isOriginAllowed(config, 'https://evil.example')).toBe(false);
    expect(trustedOrigins(config)).toEqual(['https://reviews.example']);
  });

  test('throws when APP_URL is missing', () => {
    const env = { ...productionEnv, APP_URL: undefined };
    expect(() => parseAuthConfig(env, [])).toThrow('APP_URL');
  });

  test('throws when APP_URL is http', () => {
    const env = { ...productionEnv, APP_URL: 'http://app.reviews.example' };
    expect(() => parseAuthConfig(env, [])).toThrow('APP_URL');
  });

  test('throws when APP_URL has a path', () => {
    const env = {
      ...productionEnv,
      APP_URL: 'https://app.reviews.example/invite',
    };
    expect(() => parseAuthConfig(env, [])).toThrow('APP_URL');
  });

  test('a valid config exposes the configured APP_URL', () => {
    const config = parseAuthConfig(productionEnv, []);
    expect(config.appURL).toBe('https://app.reviews.example');
  });
});

describe('parseAuthConfig in development', () => {
  const developmentEnv = { NODE_ENV: 'development' } as const;
  const lanHosts = ['192.168.1.42'];

  test('allows http://127.0.0.1 on any port', () => {
    const config = parseAuthConfig(developmentEnv, lanHosts);
    expect(isOriginAllowed(config, 'http://127.0.0.1:3000')).toBe(true);
    expect(isOriginAllowed(config, 'http://127.0.0.1:58213')).toBe(true);
  });

  test('allows a LAN IP origin on any port', () => {
    const config = parseAuthConfig(developmentEnv, lanHosts);
    expect(isOriginAllowed(config, 'http://192.168.1.42:4321')).toBe(true);
  });

  test('rejects https://evil.example', () => {
    const config = parseAuthConfig(developmentEnv, lanHosts);
    expect(isOriginAllowed(config, 'https://evil.example')).toBe(false);
  });

  test('falls back to the dev secret when BETTER_AUTH_SECRET is unset', () => {
    const config = parseAuthConfig(developmentEnv, lanHosts);
    expect(config.secret).toBe('dev-secret-dev-secret-dev-secret');
  });

  test('defaults APP_URL to the web preview on this machine', () => {
    const config = parseAuthConfig(developmentEnv, lanHosts);
    expect(config.appURL).toBe(
      'http://192.168.1.42:3000/__web_preview?casename=main.web.bundle',
    );
  });

  test('falls back to 127.0.0.1 for APP_URL when no LAN host is found', () => {
    const config = parseAuthConfig(developmentEnv, []);
    expect(config.appURL).toBe(
      'http://127.0.0.1:3000/__web_preview?casename=main.web.bundle',
    );
  });

  test('APP_URL env overrides the development default', () => {
    const env = { ...developmentEnv, APP_URL: 'http://localhost:4000/custom' };
    const config = parseAuthConfig(env, lanHosts);
    expect(config.appURL).toBe('http://localhost:4000/custom');
  });
});
