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
  GRPC:{
    CURRENT_PORT:process.env.CURRENT_PORT,
    SPOT_PORT:process.env.SPOT_PORT,
    WALLET_PORT:process.env.WALLET_PORT,
    USER_PORT:process.env.USER_PORT,
    DERIVATIVE_PORT:process.env.DERIVATIVE_PORT
  },
  IMG_PATH: {
    KYC: '/uploads/kyc',
    TRANSACTION: '/uploads/transaction',
    CURRENCY_URL: '/uploads/currency'
  }
}; 