import { and, eq } from 'drizzle-orm';
import {
  type CommandResult,
  commandError,
} from '../../identity/application/result';
import { asAppRole } from '../../identity/infra/tenant';
import { canEditLadder, canEditVersion, versionState } from '../domain/version';
import {
  criteria,
  expectations,
  ladders,
  ladderVersions,
  levels,
} from '../infra/schema';

type Actor = {
  companyId: string;
  role: 'owner' | 'admin' | 'member';
};

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function draftVersion(companyId: string, versionId: string) {
  return asAppRole(companyId, async (tx) => {
    const rows = await tx
      .select()
      .from(ladderVersions)
      .where(
        and(
          eq(ladderVersions.id, versionId),
          eq(ladderVersions.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  });
}

export async function createLadder(
  actor: Actor,
  name: string,
): Promise<CommandResult<{ ladderId: string; versionId: string }>> {
  if (!canEditLadder(actor.role)) {
    return commandError('forbidden');
  }
  const ladderId = newId('ladder');
  const versionId = newId('version');
  await asAppRole(actor.companyId, async (tx) => {
    await tx.insert(ladders).values({
      id: ladderId,
      companyId: actor.companyId,
      name,
    });
    await tx.insert(ladderVersions).values({
      id: versionId,
      ladderId,
      companyId: actor.companyId,
      state: 'draft',
    });
  });
  return { ok: true, value: { ladderId, versionId } };
}

export async function addLevel(
  actor: Actor,
  versionId: string,
  name: string,
  rank: number,
): Promise<CommandResult<{ id: string }>> {
  if (!canEditLadder(actor.role)) {
    return commandError('forbidden');
  }
  const version = await draftVersion(actor.companyId, versionId);
  if (!version) {
    return commandError('not-found');
  }
  if (!canEditVersion(versionState(version.state))) {
    return commandError('invalid');
  }
  const id = newId('level');
  await asAppRole(actor.companyId, async (tx) => {
    await tx.insert(levels).values({
      id,
      versionId,
      companyId: actor.companyId,
      name,
      rank,
    });
  });
  return { ok: true, value: { id } };
}

export async function addCriterion(
  actor: Actor,
  versionId: string,
  name: string,
): Promise<CommandResult<{ id: string }>> {
  if (!canEditLadder(actor.role)) {
    return commandError('forbidden');
  }
  const version = await draftVersion(actor.companyId, versionId);
  if (!version) {
    return commandError('not-found');
  }
  if (!canEditVersion(versionState(version.state))) {
    return commandError('invalid');
  }
  const id = newId('criterion');
  await asAppRole(actor.companyId, async (tx) => {
    await tx.insert(criteria).values({
      id,
      versionId,
      companyId: actor.companyId,
      name,
    });
  });
  return { ok: true, value: { id } };
}

export async function setExpectation(
  actor: Actor,
  versionId: string,
  input: { levelId: string; criterionId: string; body: string },
): Promise<CommandResult<{ id: string }>> {
  if (!canEditLadder(actor.role)) {
    return commandError('forbidden');
  }
  const version = await draftVersion(actor.companyId, versionId);
  if (!version) {
    return commandError('not-found');
  }
  if (!canEditVersion(versionState(version.state))) {
    return commandError('invalid');
  }
  const id = newId('expectation');
  await asAppRole(actor.companyId, async (tx) => {
    await tx
      .insert(expectations)
      .values({
        id,
        versionId,
        levelId: input.levelId,
        criterionId: input.criterionId,
        companyId: actor.companyId,
        body: input.body,
      })
      .onConflictDoUpdate({
        target: [
          expectations.versionId,
          expectations.levelId,
          expectations.criterionId,
        ],
        set: { body: input.body },
      });
  });
  return { ok: true, value: { id } };
}

export async function publishLadder(
  actor: Actor,
  versionId: string,
): Promise<CommandResult<{ state: 'published' }>> {
  if (!canEditLadder(actor.role)) {
    return commandError('forbidden');
  }
  const version = await draftVersion(actor.companyId, versionId);
  if (!version) {
    return commandError('not-found');
  }
  if (!canEditVersion(versionState(version.state))) {
    return commandError('invalid');
  }
  await asAppRole(actor.companyId, async (tx) => {
    await tx
      .update(ladderVersions)
      .set({ state: 'published' })
      .where(eq(ladderVersions.id, versionId));
  });
  return { ok: true, value: { state: 'published' } };
}

export async function readExpectation(
  actor: Actor,
  versionId: string,
  levelId: string,
  criterionId: string,
): Promise<string | null> {
  return asAppRole(actor.companyId, async (tx) => {
    const rows = await tx
      .select()
      .from(expectations)
      .where(
        and(
          eq(expectations.versionId, versionId),
          eq(expectations.levelId, levelId),
          eq(expectations.criterionId, criterionId),
        ),
      );
    return rows[0]?.body ?? null;
  });
}
