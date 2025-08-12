import { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from './middleware/auth';
import { statsRoutes } from './routes/stats';
import { usersRoutes } from './routes/users';
import { promocodesRoutes } from './routes/promocodes';
import { tasksRoutes } from './routes/tasks';
import { lotteriesRoutes } from './routes/lotteries';
import { channelsRoutes } from './routes/channels';
import { petsRoutes } from './routes/pets';
import { broadcastsRoutes } from './routes/broadcasts';

const prisma = new PrismaClient();

export function setupRoutes(app: Express) {
  // Auth routes
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      const admin = await prisma.admin.findUnique({
        where: { username }
      });

      if (!admin || !admin.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { adminId: admin.id, username: admin.username },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/verify-token', authMiddleware, (req: Request, res: Response) => {
    res.json({ valid: true, admin: (req as any).admin });
  });

  // Protected routes
  app.use('/api/stats', authMiddleware, statsRoutes);
  app.use('/api/users', authMiddleware, usersRoutes);
  app.use('/api/promocodes', authMiddleware, promocodesRoutes);
  app.use('/api/tasks', authMiddleware, tasksRoutes);
  app.use('/api/lotteries', authMiddleware, lotteriesRoutes);
  app.use('/api/channels', authMiddleware, channelsRoutes);
  app.use('/api/pets', authMiddleware, petsRoutes);
  app.use('/api/broadcasts', authMiddleware, broadcastsRoutes);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
