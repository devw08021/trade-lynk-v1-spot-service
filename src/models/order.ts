import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const OrderSide = z.enum(['buy', 'sell']);
export const OrderType = z.enum(['limit', 'market']);
export const OrderStatus = z.enum([
  'new',
  'partially_filled',
  'filled',
  'canceled',
  'rejected',
  'expired',
]);

export const TimeInForce = z.enum([
  'gtc', // Good Till Canceled
  'ioc', // Immediate Or Cancel
  'fok', // Fill Or Kill
]);

export const OrderSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.string(),
  symbol: z.string(),
  side: OrderSide,
  type: OrderType,
  status: OrderStatus.default('new'),
  quantity: z.string(),
  price: z.string().optional(),
  quoteOrderQty: z.string().optional(), 
  timeInForce: TimeInForce.optional().default('gtc'),
  origQty: z.string(), 
  executedQty: z.string().default('0'), 
  cummulativeQuoteQty: z.string().default('0'),
  stopPrice: z.string().optional(),
  icebergQty: z.string().optional(),
  clientOrderId: z.string().optional(),
  orderId: z.string().optional(),
  transactTime: z.date().default(() => new Date()),
  updateTime: z.date().default(() => new Date()),
  isWorking: z.boolean().default(true),
  fills: z.array(z.object({
    price: z.string(),
    quantity: z.string(),
    commission: z.string().optional(),
    commissionAsset: z.string().optional(),
    tradeId: z.string().optional(),
    time: z.date().default(() => new Date()),
  })).default([]),
});

export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderSchema = z.object({
  symbol: z.string(),
  side: OrderSide,
  type: OrderType,
  timeInForce: TimeInForce.optional(),
  quantity: z.string().optional(),
  quoteOrderQty: z.string().optional(),
  price: z.string().optional(),
  clientOrderId: z.string().optional(),
  stopPrice: z.string().optional(),
  icebergQty: z.string().optional(),
}).refine(data => {
  if (data.type === 'market') {
    return data.quantity !== undefined || data.quoteOrderQty !== undefined;
  }

  if (data.type === 'limit') {
    return data.price !== undefined && data.quantity !== undefined;
  }
  
  return true;
}, {
  message: "Invalid order parameters",
  path: ["type"]
});

export type CreateOrderRequest = z.infer<typeof CreateOrderSchema>;

export const CancelOrderSchema = z.object({
  symbol: z.string(),
  orderId: z.string().optional(),
  clientOrderId: z.string().optional(),
}).refine(data => {
  return data.orderId !== undefined || data.clientOrderId !== undefined;
}, {
  message: "Either orderId or clientOrderId must be provided",
  path: ["orderId", "clientOrderId"]
});

export type CancelOrderRequest = z.infer<typeof CancelOrderSchema>;

export const OrderQuerySchema = z.object({
  symbol: z.string().optional(),
  orderId: z.string().optional(),
  clientOrderId: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  limit: z.number().optional().default(500),
  side: OrderSide.optional(),
  status: OrderStatus.optional(),
  type: OrderType.optional(),
});

export type OrderQuery = z.infer<typeof OrderQuerySchema>; 