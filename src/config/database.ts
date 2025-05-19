import { MongoClient, Db } from 'mongodb';
import { env } from './env';

class Database {
  private static instance: Database;
  private client: MongoClient;
  private db: Db | null = null;
  
  private constructor() {
    this.client = new MongoClient(env.MONGODB_URI);
  }
  
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }
  
  public async connect(): Promise<Db> {
    try {
      await this.client.connect();
      this.db = this.client.db();
      console.log('Connected to MongoDB');
      return this.db;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }
  
  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
  
  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      console.log('MongoDB connection closed');
    }
  }
}

export const db = Database.getInstance();
export const connect = async (): Promise<Db> => await db.connect();
export const getDb = (): Db => db.getDb(); 