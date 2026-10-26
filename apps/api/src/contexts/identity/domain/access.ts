import type { MembershipRole } from './membership-role';

export function canInvite(role: MembershipRole): boolean {
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

export function canSetRole(role: MembershipRole): boolean {
  switch (role) {
    case 'owner':
      return true;
    case 'admin':
    case 'member':
      return false;
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}

export function canSetManager(role: MembershipRole): boolean {
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
