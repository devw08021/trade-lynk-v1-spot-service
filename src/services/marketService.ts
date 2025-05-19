import { ObjectId } from 'mongodb';
import { getDb } from '../config/database';
import { getRedisClient } from '../config/redis';
import { SymbolPair, Ticker, OrderBook, Trade, Statistics } from '../models/market';
import { PricingUtil } from '../utils/pricing';

export class MarketService {
  private readonly symbolsCollection = 'spot_symbols';
  private readonly tradesCollection = 'spot_trades';
  
  async getAllSymbols(): Promise<SymbolPair[]> {
    try {
      const cachedData = await this.getFromCache('spot_symbols_all');
      
      if (cachedData) {
        return JSON.parse(cachedData) as SymbolPair[];
      }
      
      const db = getDb();
      const collection = db.collection<SymbolPair>(this.symbolsCollection);
      
      const symbols = await collection
        .find({ status: 'active' })
        .sort({ baseAsset: 1, quoteAsset: 1 })
        .toArray();
      
      await this.cacheData('spot_symbols_all', JSON.stringify(symbols), 3600); // Cache for 1 hour
      
      return symbols;
    } catch (error) {
      console.error('Failed to get symbols:', error);
      throw new Error('Failed to retrieve trading pairs');
    }
  }
  
  async getSymbolInfo(symbol: string): Promise<SymbolPair | null> {
    try {
      const cachedData = await this.getFromCache(`spot_symbol_${symbol}`);
      
      if (cachedData) {
        return JSON.parse(cachedData) as SymbolPair;
      }
      const db = getDb();
      const collection = db.collection<SymbolPair>(this.symbolsCollection);
      
      const symbolInfo = await collection.findOne({ 
        symbol, 
        status: 'active' 
      });
      
      if (symbolInfo) {
        await this.cacheData(`spot_symbol_${symbol}`, JSON.stringify(symbolInfo), 3600); // Cache for 1 hour
      }
      
      return symbolInfo;
    } catch (error) {
      console.error(`Failed to get symbol info for ${symbol}:`, error);
      throw new Error(`Failed to retrieve details for ${symbol}`);
    }
  }
  
  async getTicker(symbol?: string): Promise<Ticker | Ticker[]> {
    try {
      const cacheKey = symbol ? `spot_ticker_${symbol}` : 'spot_ticker_all';
      
      const cachedData = await this.getFromCache(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData) as (Ticker | Ticker[]);
      }
      
      if (symbol) {
        const ticker = this.createMockTicker(symbol);
        await this.cacheData(cacheKey, JSON.stringify(ticker), 60); // Cache for 1 minute
        return ticker;
      } else {
        const symbols = await this.getAllSymbols();
        const tickers = symbols.map(s => this.createMockTicker(s.symbol));
        await this.cacheData(cacheKey, JSON.stringify(tickers), 60); // Cache for 1 minute
        return tickers;
      }
    } catch (error) {
      console.error(`Failed to get ticker data for ${symbol || 'all symbols'}:`, error);
      throw new Error('Failed to retrieve ticker data');
    }
  }
  
  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBook> {
    try {
      const cacheKey = `spot_orderbook_${symbol}_${limit}`;
      
      const cachedData = await this.getFromCache(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData) as OrderBook;
      }
      
      const orderBook = this.createMockOrderBook(symbol, limit);
      
      await this.cacheData(cacheKey, JSON.stringify(orderBook), 5); // Cache for 5 seconds
      
      return orderBook;
    } catch (error) {
      console.error(`Failed to get order book for ${symbol}:`, error);
      throw new Error(`Failed to retrieve order book for ${symbol}`);
    }
  }
  
  async getRecentTrades(symbol: string, limit: number = 50): Promise<Trade[]> {
    try {
      const db = getDb();
      const collection = db.collection<Trade>(this.tradesCollection);
      
      const trades = await collection
        .find({ symbol })
        .sort({ time: -1 })
        .limit(limit)
        .toArray();
      
      if (!trades || trades.length === 0) {
        return this.createMockTrades(symbol, limit);
      }
      
      return trades;
    } catch (error) {
      console.error(`Failed to get recent trades for ${symbol}:`, error);
      throw new Error(`Failed to retrieve recent trades for ${symbol}`);
    }
  }
  
  async get24hStats(symbol?: string): Promise<Statistics | Statistics[]> {
    try {
      const cacheKey = symbol ? `spot_stats_${symbol}` : 'spot_stats_all';
      
      const cachedData = await this.getFromCache(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData) as (Statistics | Statistics[]);
      }
      
      if (symbol) {
        const stats = this.createMockStatistics(symbol);
        await this.cacheData(cacheKey, JSON.stringify(stats), 60); // Cache for 1 minute
        return stats;
      } else {
        const symbols = await this.getAllSymbols();
        const allStats = symbols.map(s => this.createMockStatistics(s.symbol));
        await this.cacheData(cacheKey, JSON.stringify(allStats), 60); // Cache for 1 minute
        return allStats;
      }
    } catch (error) {
      console.error(`Failed to get 24h stats for ${symbol || 'all symbols'}:`, error);
      throw new Error('Failed to retrieve 24h statistics');
    }
  }
  
  async upsertSymbol(symbolData: Omit<SymbolPair, '_id' | 'createdAt' | 'updatedAt'>): Promise<SymbolPair> {
    try {
      const db = getDb();
      const collection = db.collection<SymbolPair>(this.symbolsCollection);
      
      const existingSymbol = await collection.findOne({ symbol: symbolData.symbol });
      
      if (existingSymbol) {
        const result = await collection.findOneAndUpdate(
          { symbol: symbolData.symbol },
          { 
            $set: { 
              ...symbolData,
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        );
        
        if (!result) {
          throw new Error(`Failed to update symbol ${symbolData.symbol}`);
        }
        
        await this.invalidateCache(`spot_symbol_${symbolData.symbol}`);
        await this.invalidateCache('spot_symbols_all');
        
        return result;
      } else {
        const newSymbol: SymbolPair = {
          ...symbolData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await collection.insertOne(newSymbol as any);
        newSymbol._id = result.insertedId;
        
        await this.invalidateCache('spot_symbols_all');
        
        return newSymbol;
      }
    } catch (error) {
      console.error(`Failed to upsert symbol ${symbolData.symbol}:`, error);
      throw new Error(`Failed to add or update symbol ${symbolData.symbol}`);
    }
  }
  
  async recordTrade(tradeData: Omit<Trade, '_id'>): Promise<Trade> {
    try {
      const db = getDb();
      const collection = db.collection<Trade>(this.tradesCollection);
      
      const result = await collection.insertOne(tradeData as any);
      const trade: Trade = { ...tradeData, _id: result.insertedId };
      
      await this.publishTradeEvent(trade);
      
      return trade;
    } catch (error) {
      console.error(`Failed to record trade for ${tradeData.symbol}:`, error);
      throw new Error(`Failed to record trade for ${tradeData.symbol}`);
    }
  }
  
  private async cacheData(key: string, data: string, expiry: number): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.set(key, data, { EX: expiry });
    } catch (error) {
      console.error(`Redis caching failed for ${key}:`, error);
    }
  }
  
  private async getFromCache(key: string): Promise<string | null> {
    try {
      const redis = getRedisClient();
      return await redis.get(key);
    } catch (error) {
      console.error(`Redis get failed for ${key}:`, error);
      return null;
    }
  }
  
  private async invalidateCache(key: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(key);
    } catch (error) {
      console.error(`Redis del failed for ${key}:`, error);
    }
  }
  
  private async publishTradeEvent(trade: Trade): Promise<void> {
    try {
      const redis = getRedisClient();
      const payload = JSON.stringify({
        eventType: 'spot.trade',
        data: trade,
        timestamp: new Date()
      });
      
      await redis.publish('spot-events', payload);
    } catch (error) {
      console.error('Failed to publish trade event:', error);
    }
  }
  
  private createMockTicker(symbol: string): Ticker {
    const basePrice = 1000 + Math.random() * 50000;
    const priceChange = (Math.random() - 0.5) * 100;
    
    return {
      symbol,
      price: basePrice.toFixed(2),
      priceChange: priceChange.toFixed(2),
      priceChangePercent: (priceChange / basePrice * 100).toFixed(2),
      high: (basePrice + Math.random() * 100).toFixed(2),
      low: (basePrice - Math.random() * 100).toFixed(2),
      volume: (Math.random() * 1000).toFixed(4),
      quoteVolume: (basePrice * Math.random() * 1000).toFixed(2),
      lastUpdated: new Date()
    };
  }
  
  private createMockOrderBook(symbol: string, limit: number): OrderBook {
    const basePrice = 1000 + Math.random() * 50000;
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    
    for (let i = 0; i < limit; i++) {
      bids.push({
        price: (basePrice - (i * 0.1)).toFixed(2),
        quantity: (Math.random() * 10).toFixed(4)
      });
      
      asks.push({
        price: (basePrice + (i * 0.1)).toFixed(2),
        quantity: (Math.random() * 10).toFixed(4)
      });
    }
    
    return {
      symbol,
      bids,
      asks,
      lastUpdateId: Math.floor(Math.random() * 1000000),
      lastUpdated: new Date()
    };
  }
  
  private createMockTrades(symbol: string, limit: number): Trade[] {
    const trades: Trade[] = [];
    const basePrice = 1000 + Math.random() * 50000;
    
    for (let i = 0; i < limit; i++) {
      const price = (basePrice + (Math.random() - 0.5) * 10).toFixed(2);
      const quantity = (Math.random() * 10).toFixed(4);
      
      trades.push({
        symbol,
        price,
        quantity,
        quoteQuantity: PricingUtil.calculateTotal(price, quantity),
        time: new Date(Date.now() - i * 60000), // Each trade 1 minute apart
        isBuyerMaker: Math.random() > 0.5,
        isBestMatch: true
      });
    }
    
    return trades;
  }
  
  private createMockStatistics(symbol: string): Statistics {
    const basePrice = 1000 + Math.random() * 50000;
    const priceChange = (Math.random() - 0.5) * 100;
    const volume = (Math.random() * 1000).toFixed(4);
    
    return {
      symbol,
      priceChange: priceChange.toFixed(2),
      priceChangePercent: (priceChange / basePrice * 100).toFixed(2),
      weightedAvgPrice: (basePrice + Math.random()).toFixed(2),
      prevClosePrice: (basePrice - Math.random() * 10).toFixed(2),
      lastPrice: basePrice.toFixed(2),
      lastQty: (Math.random() * 5).toFixed(4),
      bidPrice: (basePrice - 0.1).toFixed(2),
      bidQty: (Math.random() * 5).toFixed(4),
      askPrice: (basePrice + 0.1).toFixed(2),
      askQty: (Math.random() * 5).toFixed(4),
      openPrice: (basePrice - Math.random() * 20).toFixed(2),
      highPrice: (basePrice + Math.random() * 50).toFixed(2),
      lowPrice: (basePrice - Math.random() * 50).toFixed(2),
      volume,
      quoteVolume: PricingUtil.calculateTotal(basePrice, volume),
      openTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      closeTime: new Date(),
      count: Math.floor(Math.random() * 1000)
    };
  }
} 