import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Routes (Joy's routes only — Suparshv owns fuel/expenses/reports/settings)
import authRoutes from './routes/auth.routes';
import vehiclesRoutes from './routes/vehicles.routes';
import driversRoutes from './routes/drivers.routes';
import tripsRoutes from './routes/trips.routes';
import maintenanceRoutes from './routes/maintenance.routes';

import { fail } from './utils/apiResponse';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// Health check (no auth required)
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' }, error: null });
});

// ---------------------------------------------------------------------------
// Routes — Joy's modules
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// ---------------------------------------------------------------------------
// Placeholders for Suparshv's routes (not implemented — 501 stubs)
// Suparshv will replace these with real route files:
//   fuel.routes.ts, expenses.routes.ts, reports.routes.ts, settings.routes.ts
// ---------------------------------------------------------------------------

const suparshvStub = (_req: express.Request, res: express.Response) => {
  res.status(501).json(
    fail('Not yet implemented — owned by Suparshv. Check fuel/expenses/reports/settings routes.')
  );
};

app.use('/api/fuel-logs', suparshvStub);
app.use('/api/expenses', suparshvStub);
app.use('/api/reports', suparshvStub);
app.use('/api/settings', suparshvStub);

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json(fail('Route not found.'));
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error('[uncaught error]', err);
    res.status(500).json(fail('An unexpected error occurred.'));
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`✅ TransitOps API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

export default app;
