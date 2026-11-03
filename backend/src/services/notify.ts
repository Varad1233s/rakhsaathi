import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { emitToUser } from '../sockets';

export interface NotifyInput { type: string; title: string; body: string; requestId?: string }

/** Persists a notification per user and pushes it live via Socket.IO (event: notification.created). */
export async function notifyUsers(userIds: string[], n: NotifyInput) {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map(async (userId) => {
    const row = await prisma.notification.create({ data: { userId, ...n } });
    emitToUser(userId, 'notification.created', row);
  }));
}

export async function hospitalStaffIds(hospitalId: string): Promise<string[]> {
  const staff = await prisma.user.findMany({ where: { hospitalId, role: 'HOSPITAL', status: 'ACTIVE' }, select: { id: true } });
  return staff.map((s) => s.id);
}

export async function audit(actorId: string | null, action: string, entity: string, entityId: string, meta?: object) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, meta: meta as Prisma.InputJsonValue | undefined } });
}
