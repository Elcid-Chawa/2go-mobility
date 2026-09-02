import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDatabase = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(connectionUri, {
      autoIndex: true,
    });
    logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Failed to disconnect MongoDB', { error });
  }
};
