// src/config/database.ts
import mongoose from 'mongoose';
import { env } from './env';

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {
    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<typeof mongoose> {
    if (this.isConnected) {
      return mongoose;
    }

    try {
      await mongoose.connect(env.MONGODB_URI, {
        // Optional Mongoose settings
        dbName: env.MONGODB_DB_NAME || undefined,
        autoIndex: true,
      });
      this.isConnected = true;
      console.log('Connected to MongoDB with Mongoose');
      return mongoose;
    } catch (error) {
      console.error('Error connecting to MongoDB with Mongoose:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB connection closed');
    }
  }
}

// Exports
export const db = Database.getInstance();
export const connect = async (): Promise<typeof mongoose> => await db.connect();
export const closeDb = async (): Promise<void> => await db.close();
