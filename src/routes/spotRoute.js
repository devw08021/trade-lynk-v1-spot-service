import { Hono } from "hono";

// Controllers
import PairController from "@/controllers/user/getter/pair";
import OrderPlaceController from "@/controllers/user/orderPlace";
import SpotController from "@/controllers/user/getter/spot";

// Middleware
import { authMiddleware } from "@/middleware/auth";

// Validation
import { orderPlaceValidator } from "@/validation/orderPlace";

const spotRoute = new Hono();

// Controllers
const pairController = new PairController();
const orderPlaceController = new OrderPlaceController();
const spotController = new SpotController();

spotRoute.get("/trade-pair", (c) => pairController.spotPairList(c));
spotRoute.get("/trade-pair/:id", (c) => pairController.findById(c));

// Order routes - Updated to use Hono context properly
spotRoute.post(
  "/order-place",
  authMiddleware,
  orderPlaceValidator.decryptValidate,
  orderPlaceValidator.orderPlaceValidate,
  async (c) => await orderPlaceController.orderPlace(c)
);

// Market data + user data routes
spotRoute.get("/order-book/:pairId", (c) =>
  c.json({ message: "Order book endpoint" })
);
spotRoute.get("/open-order/:pairId", authMiddleware, (c) =>
  spotController.getOpenOrder(c)
);
spotRoute.get("/filled-order/:pairId", authMiddleware, (c) =>
  spotController.getFilledOrder(c)
);
spotRoute.get("/order-history/:pairId", authMiddleware, (c) =>
  spotController.getOrderHistory(c)
);
spotRoute.get("/trade-history/:pairId", authMiddleware, (c) =>
  spotController.getTradeHistory(c)
);

spotRoute.get("/market-price/:pairId", (c) => spotController.getMarketPrice(c));
spotRoute.get("/recent-trade/:pairId", (c) => spotController.getRecentTrade(c));

spotRoute.post("/cancel-order", authMiddleware, (c) =>
  c.json({ message: "Cancel order endpoint" })
);

// Depth chart (not implemented yet due to missing deps)
spotRoute.post("/depth-chart", (c) => spotController.getDepthData(c));

// Order History routes
spotRoute.get("/get-my-spot-history", authMiddleware, (c) =>
  c.json({ message: "My spot history endpoint" })
);
spotRoute.get("/get-filled-order-history", authMiddleware, (c) =>
  c.json({ message: "Filled order history endpoint" })
);

// Chart routes
spotRoute.get("/chart/:config", (c) =>
  c.json({ message: "Chart data endpoint" })
);
spotRoute.post("/chart-update-to-db", (c) =>
  c.json({ message: "Chart update to DB endpoint" })
);
spotRoute.post("/chart-update-to-redis", (c) =>
  c.json({ message: "Chart update to Redis endpoint" })
);

spotRoute.get("/get-trends", (c) => spotController.getTrends(c));

spotRoute.get("/ticker", (c) => spotController.getTickerList);
spotRoute.get("/order-book", (c) => spotController.getOrderBook);
spotRoute.get("/recent-trade", (c) => spotController.getrecentTradeByTicker);

export default spotRoute;
