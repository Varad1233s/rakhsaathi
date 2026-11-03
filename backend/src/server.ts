import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, clientOrigins } from './config/env';
import { prisma } from './config/db';
import { errorHandler } from './utils/http';
import { initSocket } from './sockets';
import { authRouter } from './routes/auth';
import { hospitalsRouter } from './routes/hospitals';
import { requestsRouter } from './routes/requests';
import { donorRouter } from './routes/donor';
import { bankRouter, bloodBanksPublicRouter } from './routes/bloodbank';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { aiRouter } from './routes/ai';
import { expireOverdueRequests } from './services/requestService';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: clientOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, time: new Date().toISOString() });
});
app.use('/api/auth', authRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/donor', donorRouter);
app.use('/api/bloodbank', bankRouter);
app.use('/api/bloodbanks', bloodBanksPublicRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);
server.listen(env.PORT, () => console.log(`RaktSaathi API listening on http://localhost:${env.PORT}`));

// Expire overdue requests every 5 minutes.
setInterval(() => { expireOverdueRequests().catch((e) => console.error('expiry job failed', e)); }, 5 * 60 * 1000);

const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
