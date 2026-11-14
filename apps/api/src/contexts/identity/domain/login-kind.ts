export const loginKinds = ['company', 'personal'] as const;

export type LoginKind = (typeof loginKinds)[number];

export function loginKind(value: string | undefined): LoginKind {
  switch (value) {
    case 'company':
    case 'personal':
      return value;
    default:
      return 'personal';
  }
}
