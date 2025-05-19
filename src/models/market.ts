import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const SymbolPairSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  baseAsset: z.string(), 
  quoteAsset: z.string(), 
  symbol: z.string(), 
  minQuantity: z.string(), 
  maxQuantity: z.string(), 
  pricePrecision: z.number(), 
  quantityPrecision: z.number(), 
  minNotional: z.string(), 
  status: z.enum(['active', 'inactive']).default('active'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type SymbolPair = z.infer<typeof SymbolPairSchema>;

export const TickerSchema = z.object({
  symbol: z.string(),
  price: z.string(),
  priceChange: z.string(),
  priceChangePercent: z.string(),
  high: z.string(),
  low: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
  lastUpdated: z.date().default(() => new Date()),
});

export type Ticker = z.infer<typeof TickerSchema>;

export const OrderBookEntrySchema = z.object({
  price: z.string(),
  quantity: z.string(),
});

export type OrderBookEntry = z.infer<typeof OrderBookEntrySchema>;

export const OrderBookSchema = z.object({
  symbol: z.string(),
  bids: z.array(OrderBookEntrySchema),
  asks: z.array(OrderBookEntrySchema),
  lastUpdateId: z.number(),
  lastUpdated: z.date().default(() => new Date()),
});

export type OrderBook = z.infer<typeof OrderBookSchema>;

export const TradeSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  symbol: z.string(),
  price: z.string(),
  quantity: z.string(),
  quoteQuantity: z.string(),
  time: z.date().default(() => new Date()),
  isBuyerMaker: z.boolean(),
  isBestMatch: z.boolean().optional(),
});

export type Trade = z.infer<typeof TradeSchema>;

export const StatisticsSchema = z.object({
  symbol: z.string(),
  priceChange: z.string(),
  priceChangePercent: z.string(),
  weightedAvgPrice: z.string(),
  prevClosePrice: z.string(),
  lastPrice: z.string(),
  lastQty: z.string(),
  bidPrice: z.string(),
  bidQty: z.string(),
  askPrice: z.string(),
  askQty: z.string(),
  openPrice: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
  openTime: z.date(),
  closeTime: z.date().default(() => new Date()),
  count: z.number(),
});

export type Statistics = z.infer<typeof StatisticsSchema>; 