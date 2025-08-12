import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { setupBot } from './bot/bot';
import { setupRoutes } from './api/routes';
import { setupCronJobs } from './utils/cron';
import { createDefaultAdmin } from './utils/setup';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
export const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, '../admin/dist')));

// API routes
setupRoutes(app);

// Serve admin panel for any /admin/* routes
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
});

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Create default admin
    await createDefaultAdmin();

    // Setup bot
    const bot = await setupBot();
    
    // Setup webhook endpoint
    app.use('/webhook', bot.webhookCallback('/webhook'));

    // Setup cron jobs
    setupCronJobs();

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📱 Admin panel: http://localhost:${port}/admin`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
