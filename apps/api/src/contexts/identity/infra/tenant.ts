import { sql } from 'drizzle-orm';
import { db } from '../../../db';

export type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function asAppRole<T>(
  companyId: string | null,
  run: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw('set local role reviews_app'));
    if (companyId) {
      await tx.execute(
        sql`select set_config('app.company_id', ${companyId}, true)`,
      );
    }
    return run(tx);
  });
}
