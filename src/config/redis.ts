import IORedis, { Redis } from "ioredis";
import { env } from "./env";

class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected && this.client) return;

    this.client = new IORedis(env.REDIS_URL);

    await new Promise<void>((resolve, reject) => {
      this.client!.once("ready", () => {
        this.isConnected = true;
        console.log("Connected to Redis");
        resolve();
      });

      this.client!.once("error", (err) => {
        console.error("Redis connection error:", err);
        this.isConnected = false;
        reject(err);
      });
    });

    this.client.on("close", () => {
      this.isConnected = false;
      console.log("Redis connection closed");
    });
  }

  public getClient(): Redis {
    if (!this.client || !this.isConnected) {
      throw new Error("Redis client not connected. Call connect() first.");
    }
    return this.client;
  }

  public async close(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log("Redis connection closed");
    }
  }

  public async publish(channel: string, message: string): Promise<number> {
    const client = this.getClient();
    return await client.publish(channel, message);
  }

  public async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    const client = this.getClient();
    await client.subscribe(channel);
    client.on("message", (ch, msg) => {
      if (ch === channel) {
        callback(msg);
      }
    });
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hset(key, field, value);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hget(key, field);
  }

  public async hdel(key: string, field: string): Promise<number> {
    const client = this.getClient();
    return await client.hdel(key, field);
  }
}

export const redis = RedisClient.getInstance();
export const connectRedis = async (): Promise<void> => await redis.connect();
export const getRedisClient = (): Redis => redis.getClient();
export const closeRedis = async (): Promise<void> => await redis.close();


export const hsetField = async (key: string, field: string, value: string): Promise<number> =>
  await redis.hset(key, field, value);

export const hgetField = async (key: string, field: string): Promise<string | null> =>
  await redis.hget(key, field);

export const hdelField = async (key: string, field: string): Promise<number> =>
  await redis.hdel(key, field);
