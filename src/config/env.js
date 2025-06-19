export const env = {
  SITE_NAME: process.env.SITE_NAME,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  NODE_ENV: process.env.NODE_ENV,
  SECRET_KEY: process.env.SECRET_KEY,
  BASE_URL: process.env.BASE_URL,
  IMG_PATH: {
    KYC: '/uploads/kyc',
    TRANSACTION: '/uploads/transaction',
    CURRENCY_URL: '/uploads/currency'
  }
}; 