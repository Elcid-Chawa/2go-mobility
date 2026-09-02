import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { ApiResponse } from './utils/apiResponse';

// Module Routes
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customer.routes';
import driverRoutes from './modules/drivers/driver.routes';
import vehicleRoutes from './modules/vehicles/vehicle.routes';
import pricingRoutes from './modules/pricing/pricing.routes';
import tripRoutes from './modules/trips/trip.routes';
import paymentRoutes from './modules/payments/payment.routes';
import ratingRoutes from './modules/ratings/rating.routes';
import adminRoutes from './modules/admin/admin.routes';

export const createApp = (): Express => {
  const app = express();

  // Security & standard middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Global rate limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use(limiter);

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    ApiResponse.success(
      res,
      {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
      },
      '2GO Authoritative API is healthy'
    );
  });

  // Base API v1 router
  const apiV1 = express.Router();
  apiV1.use('/auth', authRoutes);
  apiV1.use('/pricing', pricingRoutes);
  apiV1.use('/customers', customerRoutes);
  apiV1.use('/drivers', driverRoutes);
  apiV1.use('/vehicles', vehicleRoutes);
  apiV1.use('/trips', tripRoutes);
  apiV1.use('/trips', paymentRoutes);
  apiV1.use('/trips', ratingRoutes);
  apiV1.use('/admin', adminRoutes);

  // Mount API v1
  app.use('/api/v1', apiV1);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    ApiResponse.error(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
  });

  // Error Handler
  app.use(errorHandler);

  return app;
};
