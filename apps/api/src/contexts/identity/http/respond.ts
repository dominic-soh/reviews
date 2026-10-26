import type { Context } from 'hono';
import type { CommandFailure, CommandResult } from '../application/result';

function statusFor(error: CommandFailure['error']): 400 | 403 | 404 | 409 {
  switch (error) {
    case 'forbidden':
      return 403;
    case 'not-found':
      return 404;
    case 'conflict':
      return 409;
    case 'invalid':
      return 400;
    default: {
      const unreachable: never = error;
      return unreachable;
    }
  }
}

export function respond<T>(c: Context, result: CommandResult<T>) {
  if (result.ok) {
    return c.json(result.value);
  }
  const status = statusFor(result.error);
  if (result.reason) {
    return c.json({ error: result.error, reason: result.reason }, status);
  }
  return c.json({ error: result.error }, status);
}
