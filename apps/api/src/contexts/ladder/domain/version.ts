export const versionStates = ['draft', 'published'] as const;

export type VersionState = (typeof versionStates)[number];

export function versionState(value: string): VersionState {
  switch (value) {
    case 'draft':
    case 'published':
      return value;
    default:
      throw new Error(`unknown ladder version state ${value}`);
  }
}

export function canEditVersion(state: VersionState): boolean {
  switch (state) {
    case 'draft':
      return true;
    case 'published':
      return false;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export function canEditLadder(role: 'owner' | 'admin' | 'member'): boolean {
  switch (role) {
    case 'owner':
    case 'admin':
      return true;
    case 'member':
      return false;
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}
