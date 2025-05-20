 const env = {
    PORT: parseInt(process.env.PORT || '3002'),
    DATABASE_URI: process.env.DATABASE_URI || 'mongodb://localhost:27017/trade-lynk',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    NODE_ENV: process.env.NODE_ENV || 'development',
  }; 

  export default env