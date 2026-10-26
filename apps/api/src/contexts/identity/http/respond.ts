import type { Context } from 'hono';
import type { CommandResult } from '../application/result';

export function respond<T>(c: Context, result: CommandResult<T>) {
  if (result.ok) {
    return c.json(result.value);
  }
  switch (result.error) {
    case 'forbidden':
      return c.json({ error: result.error }, 403);
    case 'not-found':
      return c.json({ error: result.error }, 404);
    case 'conflict':
      return c.json({ error: result.error }, 409);
    case 'invalid':
      return c.json({ error: result.error }, 400);
    default: {
      const unreachable: never = result.error;
      return c.json({ error: unreachable }, 500);
    }
  }
}
