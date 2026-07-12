import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import vehiclesRoutes from './routes/vehicles.routes';
import driversRoutes from './routes/drivers.routes';
import tripsRoutes from './routes/trips.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import fuelRoutes from './routes/fuel.routes';
import expenseRoutes from './routes/expenses.routes';
import reportRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';

import { fail } from './utils/apiResponse';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel-logs', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

app.use((_req, res) => {
  res.status(404).json(fail('Route not found.'));
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[uncaught error]', err);
    res.status(500).json(fail('An unexpected error occurred.'));
  }
);

app.listen(PORT, () => {
  console.log(`✅ TransitOps API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   DB Studio: run "npm run prisma:studio" in backend/\n`);
});

export default app;
