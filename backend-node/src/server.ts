import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';

// Route imports
import authRoutes from './routes/auth.routes';
import activityRoutes from './routes/activity.routes';
import dashboardRoutes from './routes/dashboard.routes';
import simulatorRoutes from './routes/simulator.routes';
import reportRoutes from './routes/report.routes';
import aiRoutes from './routes/ai.routes';
import factorRoutes from './routes/factors.routes';
import modelRoutes from './routes/model.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static storage for downloaded reports if needed
const storagePath = path.resolve(__dirname, '../../storage/reports');
app.use('/storage/reports', express.static(storagePath));

// Health Checks
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'Healthy',
    service: 'CarbonIQ Node.js API Gateway',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activity-entries', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/whatif', simulatorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/emission-factors', factorRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
    }
  });
});

// Central Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected internal error occurred on the server.'
    }
  });
});

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`
============================================================
CarbonIQ
Carbon Footprint Prediction & Explainable AI

Frontend:   http://localhost:5173
Backend:    http://localhost:${PORT}
ML Service: http://localhost:8001
ML Docs:    http://localhost:8001/docs
============================================================
      `);
    });
  } catch (error: any) {
    console.error('Failed to launch CarbonIQ Backend Server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
