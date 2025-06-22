import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from 'hono/secure-headers'
import userRoutes from "./routes/userRoutes.js";
import { connect, closeDb } from "./config/database.js";
import { connectRedis, closeRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { ApiError } from "./utils/error.js";
import validateJsonBody from "./middleware/validate.js";
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

let app;
let isShuttingDown = false;

const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("Shutting down...");
  try {
    await closeRedis();
    await closeDb()
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

    //  Connect to Redis
    await connectRedis();
    //  Connect to DB
    await connect();
    //  Only now initialize Hono app
    app = new Hono();
    app.use("*", validateJsonBody);
    app.use("*", logger());
    app.use("*", cors());
    app.use("*", secureHeaders());
    //static folder
    function getContentType(filePath) {
      const ext = path.extname(filePath).toLowerCase()
      switch (ext) {
        case '.js': return 'application/javascript'
        case '.css': return 'text/css'
        case '.html': return 'text/html'
        case '.json': return 'application/json'
        case '.wasm': return 'application/wasm'
        case '.svg': return 'image/svg+xml'
        case '.png': return 'image/png'
        case '.jpg':
        case '.jpeg': return 'image/jpeg'
        case '.woff': return 'font/woff'
        case '.woff2': return 'font/woff2'
        default: return 'application/octet-stream'
      }
    }

    app.get('/uploads/*', async (c) => {
      const relativePath = c.req.path.replace('/uploads/', '')
      const filePath = path.join(process.cwd(), 'uploads', relativePath)

      if (!existsSync(filePath)) {
        return c.text('File not found', 404)
      }

      try {
        const fileBuffer = await fs.readFile(filePath)

        const contentType = getContentType(filePath) || 'application/octet-stream'

        return new Response(fileBuffer, {
          headers: {
            'Content-Type': contentType,
          },
        })
      } catch (err) {
        console.error('Error serving file:', err)
        return c.text('Internal Server Error', 500)
      }
    })


    // Error handler
    app.onError((err, c) => {
      console.log('err: ', err);
      if (err instanceof ApiError) {
        return c.json({ success: false, errors: err.info }, err.status);
      }
      return c.json(
        {
          success: false,
          errors: {
            code: "500",
            message: "Internal Server Error",
          },
        },
        500
      );
    });

    // Routes
    app.route("/api/user", userRoutes);
    // 404 handler
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
  fetch: (req, envVars, ctx) => app.fetch(req, envVars, ctx),
};
