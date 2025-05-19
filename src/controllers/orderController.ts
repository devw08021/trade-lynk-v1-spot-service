import { Context } from "hono";
import { OrderService } from "../services/orderService";
import {
  CreateOrderSchema,
  CancelOrderSchema,
  OrderQuerySchema,
} from "../models/order";
import { z } from "zod";

const orderService = new OrderService();

export class OrderController {
  async createOrder(c: Context) {
    try {
      const user = c.get("user");
      const data = await c.req.json();
      const validatedData = CreateOrderSchema.parse(data);
      const order = await orderService.createOrder(user.id, validatedData);
      return c.json(order, 201);
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
      return c.json({ error: "Failed to create order" }, 500);
    }
  }

  async cancelOrder(c: Context) {
    try {
      const user = c.get("user");
      const data = await c.req.json();
      const validatedData = CancelOrderSchema.parse(data);
      const order = await orderService.cancelOrder(user.id, validatedData);
      return c.json(order);
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
      return c.json({ error: "Failed to cancel order" }, 500);
    }
  }

  async getOrder(c: Context) {
    try {
      const user = c.get("user");
      const symbol = c.req.query("symbol");
      const orderId = c.req.query("orderId");
      const clientOrderId = c.req.query("clientOrderId");

      if (!symbol) {
        return c.json({ error: "Symbol is required" }, 400);
      }

      if (!orderId && !clientOrderId) {
        return c.json(
          { error: "Either orderId or clientOrderId must be provided" },
          400
        );
      }

      const order = await orderService.getOrder(
        user.id,
        symbol,
        orderId,
        clientOrderId
      );
      return c.json(order);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 404);
      }
      return c.json({ error: "Failed to fetch order" }, 500);
    }
  }

  async getOrders(c: Context) {
    try {
      const user = c.get("user");
      const queryParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(c.req.query())) {
        if (value) {
          queryParams[key] = value;
        }
      }
      const validatedQuery = OrderQuerySchema.parse(queryParams);
      const orders = await orderService.getOrders(user.id, validatedQuery);
      return c.json(orders);
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
      return c.json({ error: "Failed to fetch orders" }, 500);
    }
  }

  async getOpenOrders(c: Context) {
    try {
      const user = c.get("user");
      const symbol = c.req.query("symbol");
      const orders = await orderService.getOpenOrders(user.id, symbol);
      return c.json(orders);
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "Failed to fetch open orders" }, 500);
    }
  }
}
