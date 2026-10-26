export const loginKinds = ['company', 'personal'] as const;

export type LoginKind = (typeof loginKinds)[number];

export function loginKind(value: string): LoginKind {
  switch (value) {
    case 'company':
    case 'personal':
      return value;
    default:
      return 'company';
  }
}

export function isPersonalLogin(kind: LoginKind): boolean {
  switch (kind) {
    case 'personal':
      return true;
    case 'company':
      return false;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
