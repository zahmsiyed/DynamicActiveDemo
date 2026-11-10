// Queue operations use the same transaction connection as domain writes.
import type { Prisma } from "@prisma/client";
export const visibilitySeconds = 90;
export async function enqueue(tx: Prisma.TransactionClient, runId: string) {
  await tx.$queryRaw`SELECT pgmq.send('evaluations', ${JSON.stringify({ runId })}::jsonb)`;
}
export async function acknowledge(tx: Prisma.TransactionClient, messageId: bigint) {
  await tx.$queryRaw`SELECT pgmq.archive('evaluations', ${messageId}::bigint)`;
}
export async function deadLetter(tx: Prisma.TransactionClient, runId: string, messageId: bigint) {
  await tx.$queryRaw`SELECT pgmq.send('evaluation_dead_letters', ${JSON.stringify({ runId })}::jsonb)`;
  await acknowledge(tx, messageId);
}
