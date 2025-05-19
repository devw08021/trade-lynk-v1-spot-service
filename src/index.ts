import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import marketRoutes from './routes/marketRoutes';
import orderRoutes from './routes/orderRoutes';
import { connect } from './config/database';
import { connectRedis, redis } from './config/redis';
import { env } from './config/env';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'spot-service' });
});

app.route('/api/spot/market', marketRoutes);
app.route('/api/spot/order', orderRoutes);

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  
  try {
    await redis.close();
    console.log('All connections closed');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function bootstrap() {
  try {
    await connect();
    
    await connectRedis();
    
    try {
      const redisClient = redis.getClient();
      
      const subscriber = redisClient.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe('user-events', (message) => {
        console.log('Received user event:', message);
      });
      
      await subscriber.subscribe('spot-events', (message) => {
        console.log('Received spot event:', message);
      });
    } catch (error) {
      console.error('Failed to set up Redis subscription:', error);
    }
    
    console.log(`Starting spot-service on port ${env.PORT}`);
  } catch (error) {
    console.error('Failed to start spot-service:', error);
    process.exit(1);
  }
}

bootstrap();

export default {
  port: env.PORT,
  fetch: app.fetch
}; 