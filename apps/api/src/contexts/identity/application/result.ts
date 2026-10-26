export type CommandFailure = {
  ok: false;
  error: 'forbidden' | 'not-found' | 'conflict' | 'invalid';
};

export type CommandResult<T> = { ok: true; value: T } | CommandFailure;

export function commandError(error: CommandFailure['error']): CommandFailure {
  return { ok: false, error };
}
