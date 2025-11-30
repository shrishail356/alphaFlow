import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { testDbConnection } from './clients/db';

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true
  })
);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

app.use(limiter);

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await testDbConnection();
    res.json({ status: 'ok' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Health check failed', err);
    res.status(500).json({ status: 'error' });
  }
});

// Auth routes
import authRoutes from './routes/auth.routes';
app.use('/api/auth', authRoutes);

// Decibel routes
import decibelRoutes from './routes/decibel.routes';
app.use('/api/decibel', decibelRoutes);

// AI routes
import aiRoutes from './routes/ai.routes';
app.use('/api/ai', aiRoutes);

// Trading routes
import tradingRoutes from './routes/trading.routes';
app.use('/api/trading', tradingRoutes);

// Portfolio routes
import portfolioRoutes from './routes/portfolio.routes';
app.use('/api/portfolio', portfolioRoutes);

// Rewards routes
import rewardsRoutes from './routes/rewards.routes';
app.use('/api/rewards', rewardsRoutes);

// News routes
import newsRoutes from './routes/news.routes';
app.use('/api/news', newsRoutes);

app.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${env.PORT}`);
});



