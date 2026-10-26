export type CommandFailure = {
  ok: false;
  error: 'forbidden' | 'not-found' | 'conflict' | 'invalid';
  reason?: 'member' | 'invited';
};

export type CommandResult<T> = { ok: true; value: T } | CommandFailure;

export function commandError(
  error: CommandFailure['error'],
  reason?: CommandFailure['reason'],
): CommandFailure {
  if (reason) {
    return { ok: false, error, reason };
  }
  return { ok: false, error };
}
