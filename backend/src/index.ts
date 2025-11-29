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

app.listen(env.PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${env.PORT}`);
});



