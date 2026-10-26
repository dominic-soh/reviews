import { describe, expect, test } from 'bun:test';
import { managerCreatesCycle } from './reporting';

describe('managerCreatesCycle', () => {
  test('rejects a line that points a person at their own report', () => {
    const lines = [
      { membershipId: 'ada', managerMembershipId: 'bea' },
      { membershipId: 'bea', managerMembershipId: 'cy' },
    ];
    expect(managerCreatesCycle(lines, 'bea', 'ada')).toBe(true);
    expect(managerCreatesCycle(lines, 'cy', 'dee')).toBe(false);
    expect(managerCreatesCycle(lines, 'ada', 'ada')).toBe(true);
  });
});
