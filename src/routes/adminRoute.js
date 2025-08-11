import { Hono } from "hono";

// Controllers
import PairController from "@/controllers/user/getter/pair";
import OrderPlaceController from "@/controllers/user/orderPlace";
import SpotController from "@/controllers/user/getter/spot";

// Middleware
import { adminMiddleware } from "@/middleware/auth";
import { createRateLimit } from "@/middleware/rateLimit";

// Validation
import { orderPlaceValidator } from "@/validation/orderPlace";
import {
  addSpotPairValidation,
  editSpotPairValidation,
} from "@/validation/pair";
import { addSpotPair, editSpotPair } from "@/controllers/admin/write/pair";
import { DateValidator, validateDate } from "@/validation/date";

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
  },
});

adminRoute.use("*", adminRateLimit);

// Dashboard & Analytics Routes
adminRoute.get("/dashboard/notification", adminMiddleware, async (c) => {
  try {
    // TODO: Implement getNotification controller
    return c.json({
      success: true,
      message: "Notifications endpoint",
      result: [],
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch notifications",
      },
      500
    );
  }
});

adminRoute.get("/dashboard/chart", adminMiddleware, async (c) => {
  try {
    // TODO: Implement getDashChart controller
    return c.json({
      success: true,
      message: "Dashboard chart endpoint",
      result: {},
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch dashboard chart",
      },
      500
    );
  }
});

// Spot Trading Pair Management
adminRoute.get("/spot-pair", adminMiddleware, async (c) => {
  return await pairController.spotPairList(c);
});

adminRoute.post(
  "/spot-pair",
  adminMiddleware,
  addSpotPairValidation,
  addSpotPair
);

adminRoute.put(
  "/spot-pair/:id",
  adminMiddleware,
  editSpotPairValidation,
  editSpotPair
);

adminRoute.get("/spot-pair/:id", adminMiddleware, pairController.findById);

adminRoute.get(
  "/spot-order-history",
  adminMiddleware,
  validateDate(),
  historyController.spotOrderHistory
);

adminRoute.get(
  "/spot-order-history-doc",
  adminMiddleware,
  historyController.spotOrderHistoryDoc
);

// Spot trade history
adminRoute.get(
  "/spot-trade-history",
  adminMiddleware,
  validateDate(),
  historyController.spotTradeHistory
);

adminRoute.get(
  "/spot-trade-history-doc",
  adminMiddleware,
  historyController.spotTradeHistoryDoc
);

adminRoute.get(
  "/spot-trade-user-history",
  adminMiddleware,
  validateDate(),
  historyController.spotTradeUserHistory
);

// Admin Fee Management
adminRoute.get("/admin-fee", adminMiddleware, async (c) => {
  try {
    // TODO: Implement getAdminFee controller
    return c.json({
      success: true,
      message: "Admin fee endpoint",
      result: {},
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Failed to fetch admin fee",
      },
      500
    );
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
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Health check failed",
      },
      500
    );
  }
});

// Error handling for admin routes
adminRoute.onError((err, c) => {
  console.error("Admin route error:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error in admin route",
      message: err.message,
    },
    500
  );
});

export default adminRoute;
