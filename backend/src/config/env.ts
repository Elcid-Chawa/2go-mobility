import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/2go_dev',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '2go_fallback_access_secret_key_32chars_min',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '2go_fallback_refresh_secret_key_32chars_min',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:19006,http://localhost:8081')
    .split(',')
    .map((origin) => origin.trim()),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DISPATCH_OFFER_TIMEOUT_SECONDS: parseInt(process.env.DISPATCH_OFFER_TIMEOUT_SECONDS || '15', 10),
  DISPATCH_SEARCH_RADIUS_KM: parseFloat(process.env.DISPATCH_SEARCH_RADIUS_KM || '10'),
};
