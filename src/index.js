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

// Controllers
import PairController from "@/controllers/user/getter/pair";
import OrderPlaceController from "@/controllers/user/orderPlace";
import SpotController from "@/controllers/user/getter/spot";

// Middleware
import { adminMiddleware } from "@/middleware/auth";
import { createRateLimit } from "@/middleware/rateLimit";

// Validation
import { orderPlaceValidator } from "@/validation/orderPlace";

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

    const adminRoute = new Hono();

    // Controllers
    const pairController = new PairController();
    const orderPlaceController = new OrderPlaceController();
    const spotController = new SpotController();

    // Rate limiting for admin endpoints
    const adminRateLimit = createRateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,
      message: "Admin rate limit exceeded. Please try again later.",
      keyGenerator: (c) => {
        const user = c.get("user");
        return user ? `admin:${user.userId}` : "admin:anonymous";
      }
    });

    // Apply rate limiting to all admin routes
    adminRoute.use("*", adminRateLimit);

    // Dashboard & Analytics Routes
    adminRoute.get("/dashboard/notification", adminMiddleware, async (c) => {
      try {
        // TODO: Implement getNotification controller
        return c.json({ 
          success: true, 
          message: "Notifications endpoint", 
          result: [] 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch notifications" 
        }, 500);
      }
    });

    adminRoute.get("/dashboard/chart", adminMiddleware, async (c) => {
      try {
        // TODO: Implement getDashChart controller
        return c.json({ 
          success: true, 
          message: "Dashboard chart endpoint", 
          result: {} 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch dashboard chart" 
        }, 500);
      }
    });

    // Spot Trading Pair Management
    adminRoute.get("/spot-pair", adminMiddleware, async (c) => {
      return await pairController.spotPairList(c);
    });

    adminRoute.post("/spot-pair", adminMiddleware, async (c) => {
      try {
        // TODO: Implement addSpotPair controller
        return c.json({ 
          success: true, 
          message: "Add spot pair endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to add spot pair" 
        }, 500);
      }
    });

    adminRoute.put("/spot-pair/:id", adminMiddleware, async (c) => {
      try {
        // TODO: Implement editSpotPair controller
        const { id } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Edit spot pair ${id} endpoint` 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to edit spot pair" 
        }, 500);
      }
    });

    adminRoute.get("/spot-pair/:id", adminMiddleware, async (c) => {
      return await pairController.findById(c);
    });

    // Spot Order History Routes
    adminRoute.get("/spot-order-history", adminMiddleware, async (c) => {
      try {
        // TODO: Implement spotOrderHistory controller with date validation
        const query = c.req.query();
        return c.json({ 
          success: true, 
          message: "Spot order history endpoint",
          query 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch spot order history" 
        }, 500);
      }
    });

    adminRoute.get("/spot-order-history-doc", adminMiddleware, async (c) => {
      try {
        // TODO: Implement spotOrderHistoryDoc controller
        return c.json({ 
          success: true, 
          message: "Spot order history document endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch spot order history document" 
        }, 500);
      }
    });

    adminRoute.get("/spot-trade-history", adminMiddleware, async (c) => {
      try {
        // TODO: Implement spotTradeHistory controller with date validation
        const query = c.req.query();
        return c.json({ 
          success: true, 
          message: "Spot trade history endpoint",
          query 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch spot trade history" 
        }, 500);
      }
    });

    adminRoute.get("/spot-trade-history-doc", adminMiddleware, async (c) => {
      try {
        // TODO: Implement spotTradeHistoryDoc controller
        return c.json({ 
          success: true, 
          message: "Spot trade history document endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch spot trade history document" 
        }, 500);
      }
    });

    adminRoute.get("/spot-trade-user-history", adminMiddleware, async (c) => {
      try {
        // TODO: Implement spotTradeUserHistory controller with date validation
        const query = c.req.query();
        return c.json({ 
          success: true, 
          message: "Spot trade user history endpoint",
          query 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch spot trade user history" 
        }, 500);
      }
    });

    // Trading Bot Management
    adminRoute.post("/bot", adminMiddleware, async (c) => {
      try {
        // TODO: Implement newBot controller with validation
        return c.json({ 
          success: true, 
          message: "Create new bot endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to create bot" 
        }, 500);
      }
    });

    adminRoute.put("/bot/:id", adminMiddleware, async (c) => {
      try {
        // TODO: Implement updateBot controller with validation
        const { id } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Update bot ${id} endpoint` 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to update bot" 
        }, 500);
      }
    });

    adminRoute.get("/bot", adminMiddleware, async (c) => {
      try {
        // TODO: Implement botList controller
        return c.json({ 
          success: true, 
          message: "Bot list endpoint",
          result: [] 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch bot list" 
        }, 500);
      }
    });

    adminRoute.get("/bot/:id", adminMiddleware, async (c) => {
      try {
        // TODO: Implement findByID controller
        const { id } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Find bot ${id} endpoint`,
          result: {} 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to find bot" 
        }, 500);
      }
    });

    adminRoute.get("/bot-pair-list", adminMiddleware, async (c) => {
      try {
        // TODO: Implement getPairList controller
        return c.json({ 
          success: true, 
          message: "Bot pair list endpoint",
          result: [] 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch bot pair list" 
        }, 500);
      }
    });

    // Bot User Management
    adminRoute.post("/bot-user", adminMiddleware, async (c) => {
      try {
        // TODO: Implement newBotUser controller
        return c.json({ 
          success: true, 
          message: "Add bot user endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to add bot user" 
        }, 500);
      }
    });

    adminRoute.get("/bot-user", adminMiddleware, async (c) => {
      try {
        // TODO: Implement getBotUser controller
        return c.json({ 
          success: true, 
          message: "Get bot user endpoint",
          result: [] 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch bot users" 
        }, 500);
      }
    });

    adminRoute.get("/bot-order-cancel/:botId", adminMiddleware, async (c) => {
      try {
        // TODO: Implement botAllOpenOrderCancel controller
        const { botId } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Cancel all open orders for bot ${botId} endpoint` 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to cancel bot orders" 
        }, 500);
      }
    });

    // Volume Bot Management
    adminRoute.post("/volume-bot", adminMiddleware, async (c) => {
      try {
        // TODO: Implement newVolBot controller with validation
        return c.json({ 
          success: true, 
          message: "Create new volume bot endpoint" 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to create volume bot" 
        }, 500);
      }
    });

    adminRoute.put("/volume-bot/:id", adminMiddleware, async (c) => {
      try {
        // TODO: Implement updateVolBot controller with validation
        const { id } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Update volume bot ${id} endpoint` 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to update volume bot" 
        }, 500);
      }
    });

    adminRoute.get("/volume-bot", adminMiddleware, async (c) => {
      try {
        // TODO: Implement volBotList controller
        return c.json({ 
          success: true, 
          message: "Volume bot list endpoint",
          result: [] 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch volume bot list" 
        }, 500);
      }
    });

    adminRoute.get("/volume-bot/:id", adminMiddleware, async (c) => {
      try {
        // TODO: Implement findByID controller for volume bot
        const { id } = c.req.param();
        return c.json({ 
          success: true, 
          message: `Find volume bot ${id} endpoint`,
          result: {} 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to find volume bot" 
        }, 500);
      }
    });

    // Admin Fee Management
    adminRoute.get("/admin-fee", adminMiddleware, async (c) => {
      try {
        // TODO: Implement getAdminFee controller
        return c.json({ 
          success: true, 
          message: "Admin fee endpoint",
          result: {} 
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Failed to fetch admin fee" 
        }, 500);
      }
    });

    // System Health & Monitoring
    adminRoute.get("/health", adminMiddleware, async (c) => {
      try {
        return c.json({
          success: true,
          message: "System health check",
          result: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
          }
        });
      } catch (error) {
        return c.json({ 
          success: false, 
          error: "Health check failed" 
        }, 500);
      }
    });

    // Error handling for admin routes
    adminRoute.onError((err, c) => {
      console.error("Admin route error:", err);
      return c.json({
        success: false,
        error: "Internal server error in admin route",
        message: err.message
      }, 500);
    });

    app.route("/api/admin", adminRoute); // Add this line

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
