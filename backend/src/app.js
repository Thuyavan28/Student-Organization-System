import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { env } from './config/env.js';
import { UPLOAD_DIR } from './middleware/upload.js';
import { apiRouter } from './routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { timing } from './middleware/timing.js';

export const app = express();

app.disable('x-powered-by');
app.use(timing);
app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_ORIGIN, exposedHeaders: ['Server-Timing', 'ETag'] }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
