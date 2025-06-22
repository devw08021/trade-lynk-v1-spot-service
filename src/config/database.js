// src/config/database.js
import mongoose from 'mongoose';
import { env } from './env.js';

class Database {
  static instance;
  isConnected = false;

  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    if (!env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    Database.instance = this;
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect() {
    if (this.isConnected) {
      return mongoose;
    }

    try {
      await mongoose.connect(env.MONGODB_URI, {
        autoIndex: true,
      });
      this.isConnected = true; ``
      console.log('✅ Connected to MongoDB with Mongoose');
      require('../config/cron.js')
      // require('../config/initial.js')
      return mongoose;
    } catch (error) {
      console.error('Error connecting to MongoDB with Mongoose:', error);
      throw error;
    }
  }

  async close() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 MongoDB connection closed');
    }
  }
}

const db = Database.getInstance();
const connect = async () => await db.connect();
const closeDb = async () => await db.close();

export { db, connect, closeDb };
