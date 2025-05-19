import { Context } from "hono";
import { MarketService } from "../services/marketService";
import { z } from "zod";

const marketService = new MarketService();

const GetOrderBookSchema = z.object({
  symbol: z.string(),
  limit: z.preprocess(
    (val) => Number(val) || 100,
    z.number().positive().max(1000).default(100)
  ),
});

const GetTradesSchema = z.object({
  symbol: z.string(),
  limit: z.preprocess(
    (val) => Number(val) || 50,
    z.number().positive().max(1000).default(50)
  ),
});

const SymbolUpsertSchema = z.object({
  baseAsset: z.string(),
  quoteAsset: z.string(),
  symbol: z.string(),
  minQuantity: z.string(),
  maxQuantity: z.string(),
  pricePrecision: z.number(),
  quantityPrecision: z.number(),
  minNotional: z.string(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export class MarketController {
  async getAllSymbols(c: Context) {
    try {
      const symbols = await marketService.getAllSymbols();
      return c.json(symbols);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to fetch symbols" }, 500);
    }
  }

  async getSymbolInfo(c: Context) {
    try {
      const symbol = c.req.param("symbol");
      const symbolInfo = await marketService.getSymbolInfo(symbol);

      if (!symbolInfo) {
        return c.json({ error: `Symbol ${symbol} not found` }, 404);
      }

      return c.json(symbolInfo);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to fetch symbol info" }, 500);
    }
  }

  async getTicker(c: Context) {
    try {
      const symbol = c.req.query("symbol");
      const ticker = await marketService.getTicker(symbol);
      return c.json(ticker);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to fetch ticker data" }, 500);
    }
  }

  async getOrderBook(c: Context) {
    try {
      const symbol = c.req.param("symbol");
      const limitStr = c.req.query("limit");

      const { limit } = GetOrderBookSchema.parse({
        symbol,
        limit: limitStr,
      });

      const orderBook = await marketService.getOrderBook(symbol, limit);
      return c.json(orderBook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Validation failed", details: error.issues },
          400
        );
      }

      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({ error: "Failed to fetch order book" }, 500);
    }
  }

  async getRecentTrades(c: Context) {
    try {
      const symbol = c.req.param("symbol");
      const limitStr = c.req.query("limit");

      const { limit } = GetTradesSchema.parse({
        symbol,
        limit: limitStr,
      });

      const trades = await marketService.getRecentTrades(symbol, limit);
      return c.json(trades);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Validation failed", details: error.issues },
          400
        );
      }

      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({ error: "Failed to fetch recent trades" }, 500);
    }
  }

  async get24hStats(c: Context) {
    try {
      const symbol = c.req.query("symbol");
      const stats = await marketService.get24hStats(symbol);
      return c.json(stats);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to fetch 24h statistics" }, 500);
    }
  }

  async upsertSymbol(c: Context) {
    try {
      const user = c.get("user");

      if (user.role !== "admin") {
        return c.json({ error: "Admin rights required" }, 403);
      }

      const data = await c.req.json();
      const validatedData = SymbolUpsertSchema.parse(data);

      const result = await marketService.upsertSymbol(validatedData);
      return c.json(result, 200);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          { error: "Validation failed", details: error.issues },
          400
        );
      }

      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }

      return c.json({ error: "Failed to add or update symbol" }, 500);
    }
  }
}
