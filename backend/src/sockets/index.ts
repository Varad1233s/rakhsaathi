import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { clientOrigins } from '../config/env';
import { prisma } from '../config/db';
import { verifyToken } from '../middleware/auth';

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: clientOrigins, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as { token?: string })?.token;
      const id = token ? verifyToken(token) : null;
      const u = id ? await prisma.user.findUnique({ where: { id } }) : null;
      if (!u || u.status !== 'ACTIVE') return next(new Error('unauthorized'));
      socket.data.userId = u.id;
      socket.data.role = u.role;
      socket.data.hospitalId = u.hospitalId;
      next();
    } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', async (socket) => {
    const { userId, role, hospitalId } = socket.data as { userId: string; role: string; hospitalId: string | null };
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);
    if (hospitalId) socket.join(`hospital:${hospitalId}`);
    if (role === 'BLOODBANK') {
      const bank = await prisma.bloodBank.findUnique({ where: { userId } });
      if (bank) socket.join(`bank:${bank.id}`);
    }
  });
  return io;
}

export const emitToUser = (userId: string, event: string, payload: unknown) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToRole = (role: string, event: string, payload: unknown) => io?.to(`role:${role}`).emit(event, payload);
export const emitToHospital = (hospitalId: string, event: string, payload: unknown) => io?.to(`hospital:${hospitalId}`).emit(event, payload);
export const emitToBank = (bankId: string, event: string, payload: unknown) => io?.to(`bank:${bankId}`).emit(event, payload);
