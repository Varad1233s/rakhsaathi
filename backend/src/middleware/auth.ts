import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { HttpError } from '../utils/http';

export interface AuthUser { id: string; role: Role; name: string; hospitalId: string | null }
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { user?: AuthUser } }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): string | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    return p.sub ?? null;
  } catch { return null; }
}

async function loadUser(req: Request): Promise<AuthUser | null> {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const id = verifyToken(h.slice(7));
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u || u.status !== 'ACTIVE') return null;
  return { id: u.id, role: u.role, name: u.name, hospitalId: u.hospitalId };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const u = await loadUser(req);
    if (!u) throw new HttpError(401, 'Authentication required');
    req.user = u;
    next();
  } catch (e) { next(e); }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try { req.user = (await loadUser(req)) ?? undefined; next(); } catch (e) { next(e); }
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission for this action'));
  next();
};
