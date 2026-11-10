// Report publication emits notifications transactionally. This helper only reads
// the current account's notification center; no simulated email path remains.
import { getDb } from "@/lib/db";
export async function getNotificationCenter(userId: string) {
  const db = getDb();
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      select: {
        id: true,
        body: true,
        createdAt: true,
        observationId: true,
        readAt: true,
        title: true,
        type: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}
