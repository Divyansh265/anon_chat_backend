import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import healthRouter from './routes/health.js';

const app = express();

const corsOptions =
  config.corsOrigin === '*'
    ? { origin: '*' }
    : { origin: config.corsOrigin, credentials: true };

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
