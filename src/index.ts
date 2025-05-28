import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes";
import { connect } from "./config/database";
import { connectRedis, getRedisClient, closeRedis } from "./config/redis";
import { env } from "./config/env";
import { ApiError } from './utils/error';

let app: Hono;

const shutdown = async () => {
  console.log("Shutting down...");
  try {
    await closeRedis();
    console.log("All connections closed");
  } catch (error) {
    console.error("Error during shutdown:", error);
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function bootstrap() {
  try {
    // 1. Connect to DB
    await connect();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Redis Subscriber Setup (Optional)
    try {
      const redisClient = getRedisClient(); // Now safe
      const subscriber = redisClient.duplicate();


      // await subscriber.subscribe("user-events", (message) => {
      //   console.log("Received user event:", message);
      // });
    } catch (error) {
      console.error("Failed to set up Redis subscription:", error);
    }

    // 4. Only now initialize Hono app
    app = new Hono();


    app.use("*", logger());
    app.use("*", cors());

    // 1) set up error handler
    app.onError((err, c) => {
      if (err instanceof ApiError) {
        return c.json({ success: false, errors: err.info }, err.status);
      }
      if (process.env.NODE_ENV !== 'production') console.error(err);
      return c.json(
        {
          success: false,
          errors: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal Server Error',
          },
        },
        500
      );
    });

    // ✅ Routes are only registered after DB is ready
    app.route("/api/auth", authRoutes);
    app.route("/api/user", userRoutes);
    app.route("/api/admin/v1", adminRoutes);
    
    // not found handler
    app.notFound((c) => {
      return c.json({ success: false, message: "Not Found" }, 404);
    });


  } catch (error) {
    console.error("Failed to start user-service:", error);
    process.exit(1);
  }
}

bootstrap();

export default {
  port: env.PORT,
  fetch: (req: Request, env: unknown, ctx: ExecutionContext) =>
    app.fetch(req, env, ctx),
};
