import { createClient, RedisClientType } from 'redis';
import { env } from './env';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private isConnected: boolean = false;
  
  private constructor() {
    this.client = createClient({
      url: env.REDIS_URL
    });
    
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
      this.isConnected = false;
    });
    
    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });
  }
  
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }
  
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }
  
  public getClient(): RedisClientType {
    if (!this.isConnected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }
  
  public async close(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis connection closed');
    }
  }
  
  public async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    }
  }
  
  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      await subscriber.subscribe(channel, callback);
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }
  
  public async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    try {
      if (expirySeconds) {
        await this.client.set(key, value, { EX: expirySeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis set operation failed:', error);
      throw error;
    }
  }
  
  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get operation failed:', error);
      throw error;
    }
  }
  
  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del operation failed:', error);
      throw error;
    }
  }
}

export const redis = RedisClient.getInstance();
export const connectRedis = async (): Promise<void> => await redis.connect();
export const getRedisClient = (): RedisClientType => redis.getClient(); 