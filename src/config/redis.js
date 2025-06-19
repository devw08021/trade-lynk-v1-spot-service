// src/config/redis.js
import IORedis from 'ioredis';

// Update this if needed
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  static instance;
  client = null;
  isConnected = false;

  constructor() {
    if (RedisClient.instance) return RedisClient.instance;
    RedisClient.instance = this;
  }

  static getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect() {
    if (this.isConnected && this.client) return;
    this.client = new IORedis(REDIS_URL);

    await new Promise((resolve, reject) => {
      this.client.once('ready', () => {
        this.isConnected = true;
        console.log('✅ Connected to Redis');
        resolve();
      });

      this.client.once('error', (err) => {
        console.error('❌ Redis connection error:', err);
        this.isConnected = false;
        reject(err);
      });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('🔌 Redis connection closed');
    });
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('🔌 Redis connection closed');
    }
  }

  // Hash functions
  async hset(key, field, value) {
    return await this.getClient().hset(String(key), String(field), JSON.stringify(value));
  }

  async hsetMulti(key, data = {}) {
    return await this.getClient().hset(key, data);
  }

  async hget(key, field) {
    return await this.getClient().hget(key, field);
  }

  async hgetAll(key) {
    return await this.getClient().hgetall(key);
  }

  async hmget(key, ...fields) {
    return await this.getClient().hmget(key, ...fields);
  }

  async hdel(key, field) {
    return await this.getClient().hdel(key, field);
  }

  // Set functions
  async sadd(key, ...members) {
    return await this.getClient().sadd(key, ...members);
  }

  async smembers(key) {
    return await this.getClient().smembers(key);
  }

  async srem(key, ...members) {
    return await this.getClient().srem(key, ...members);
  }
  async get(key) {
    return await this.getClient().get(key);
  }
  async set(key, data) {
    return await this.getClient().set(key, JSON.stringify(data));
  }
}

// Singleton + wrappers
const redis = RedisClient.getInstance();

const connectRedis = async () => await redis.connect();
const closeRedis = async () => await redis.close();

const hsetField = async (key, field, value) => await redis.hset(key, field, value);
const hsetMulti = async (key, data) => {
  try {
    const multi = redis.getClient().multi();

    field.forEach(item => {
      const key = hash === 'mtAccount' ? item?.loginId?.toString() : item?._id?.toString();
      if (key) {
        multi.hset(hash, key, JSON.stringify(item));
      }
    });

    const replies = await multi.exec();
    return replies;
  } catch (err) {
    console.error('Error performing bulk HSET:', err);
    return null;
  }
};
const hgetField = async (key, field) => JSON.parse(await redis.hget(key, String(field)));
const get = async (key) => JSON.parse(await redis.get(key));
const set = async (key, value) => await redis.set(key, value);
const hgetAll = async (key) => await redis.hgetAll(key);
const hmgetFields = async (key, ...fields) => await redis.hmget(key, ...fields);
const hdelField = async (key, field) => await redis.hdel(key, field);
const hgetMulti = async (hash, field) => {
  try {
    const result = await redis.hmget(hash, field);
    return result.length > 0 ? result.map(item => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    }) : null;
  } catch (err) {
    return null;
  }
};
const sadd = async (key, ...members) => await redis.sadd(key, ...members);
const sget = async (key) => await redis.smembers(key);
const sremove = async (key, ...members) => await redis.srem(key, ...members);

export {
  redis,
  connectRedis,
  closeRedis,
  hsetField,
  hsetMulti,
  hgetField,
  hgetAll,
  hmgetFields,
  hdelField,
  get,
  set,
  sadd,
  sget,
  sremove,
  hgetMulti
};
