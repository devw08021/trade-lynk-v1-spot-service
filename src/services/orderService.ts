import { ObjectId } from 'mongodb';
import { getDb } from '../config/database';
import { getRedisClient } from '../config/redis';
import { Order, CreateOrderRequest, CancelOrderRequest, OrderQuery } from '../models/order';
import { Trade } from '../models/market';
import { PricingUtil } from '../utils/pricing';
import { MarketService } from './marketService';
import Decimal from 'decimal.js';

export class OrderService {
  private readonly ordersCollection = 'spot_orders';
  private marketService: MarketService;
  
  constructor() {
    this.marketService = new MarketService();
  }
  
  /**
   * Create a new order
   */
  async createOrder(userId: string, orderRequest: CreateOrderRequest): Promise<Order> {
    try {
      // Get symbol info for validations
      const symbolInfo = await this.marketService.getSymbolInfo(orderRequest.symbol);
      if (!symbolInfo) {
        throw new Error(`Invalid symbol: ${orderRequest.symbol}`);
      }
      
      // Validate price and quantity based on symbol constraints
      if (orderRequest.type === 'limit') {
        this.validateLimitOrder(orderRequest, symbolInfo);
      }
      
      // Generate an order ID
      const orderId = this.generateOrderId();
      
      // Create the order object
      const order: Order = {
        userId,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        status: 'new',
        quantity: orderRequest.quantity || '0',
        origQty: orderRequest.quantity || '0',
        executedQty: '0',
        cummulativeQuoteQty: '0',
        price: orderRequest.price,
        quoteOrderQty: orderRequest.quoteOrderQty,
        clientOrderId: orderRequest.clientOrderId || `order_${Date.now()}`,
        timeInForce: orderRequest.timeInForce || 'gtc',
        transactTime: new Date(),
        updateTime: new Date(),
        isWorking: true,
        fills: []
      };
      
      // Save the order to the database
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      const result = await collection.insertOne(order as any);
      
      // Update the order with the MongoDB ID
      order._id = result.insertedId;
      
      // Process the order (in a real system, this would be done by a matching engine)
      // For demo purposes, we'll simulate processing
      await this.processOrderSimulation(order);
      
      // Publish order event
      await this.publishOrderEvent('spot.order.created', order);
      
      return order;
    } catch (error) {
      console.error(`Failed to create order for ${orderRequest.symbol}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel an existing order
   */
  async cancelOrder(userId: string, cancelRequest: CancelOrderRequest): Promise<Order> {
    try {
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      
      // Build the query to find the order
      const query: any = { 
        userId,
        symbol: cancelRequest.symbol,
        status: { $in: ['new', 'partially_filled'] }
      };
      
      if (cancelRequest.orderId) {
        query.orderId = cancelRequest.orderId;
      } else if (cancelRequest.clientOrderId) {
        query.clientOrderId = cancelRequest.clientOrderId;
      }
      
      // Find and update the order
      const result = await collection.findOneAndUpdate(
        query,
        {
          $set: {
            status: 'canceled',
            updateTime: new Date(),
            isWorking: false
          }
        },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        throw new Error('Order not found or already completed/canceled');
      }
      
      // Publish order canceled event
      await this.publishOrderEvent('spot.order.canceled', result);
      
      return result;
    } catch (error) {
      console.error(`Failed to cancel order:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific order by ID
   */
  async getOrder(userId: string, symbol: string, orderId?: string, clientOrderId?: string): Promise<Order> {
    try {
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      
      // Build the query
      const query: any = { userId, symbol };
      
      if (orderId) {
        query.orderId = orderId;
      } else if (clientOrderId) {
        query.clientOrderId = clientOrderId;
      } else {
        throw new Error('Either orderId or clientOrderId must be provided');
      }
      
      const order = await collection.findOne(query);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      return order;
    } catch (error) {
      console.error(`Failed to get order:`, error);
      throw error;
    }
  }
  
  /**
   * Get all orders for a user with optional filters
   */
  async getOrders(userId: string, query: OrderQuery): Promise<Order[]> {
    try {
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      
      // Build the query
      const dbQuery: any = { userId };
      
      if (query.symbol) dbQuery.symbol = query.symbol;
      if (query.orderId) dbQuery.orderId = query.orderId;
      if (query.clientOrderId) dbQuery.clientOrderId = query.clientOrderId;
      if (query.side) dbQuery.side = query.side;
      if (query.status) dbQuery.status = query.status;
      if (query.type) dbQuery.type = query.type;
      
      // Add time range filter if provided
      if (query.startTime || query.endTime) {
        dbQuery.transactTime = {};
        
        if (query.startTime) {
          dbQuery.transactTime.$gte = new Date(query.startTime);
        }
        
        if (query.endTime) {
          dbQuery.transactTime.$lte = new Date(query.endTime);
        }
      }
      
      // Execute the query
      const orders = await collection
        .find(dbQuery)
        .sort({ transactTime: -1 })
        .limit(query.limit)
        .toArray();
      
      return orders;
    } catch (error) {
      console.error(`Failed to get orders:`, error);
      throw error;
    }
  }
  
  /**
   * Get open orders for a user
   */
  async getOpenOrders(userId: string, symbol?: string): Promise<Order[]> {
    try {
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      
      // Build the query
      const query: any = { 
        userId, 
        status: { $in: ['new', 'partially_filled'] },
        isWorking: true
      };
      
      if (symbol) {
        query.symbol = symbol;
      }
      
      // Execute the query
      const orders = await collection
        .find(query)
        .sort({ transactTime: -1 })
        .toArray();
      
      return orders;
    } catch (error) {
      console.error(`Failed to get open orders:`, error);
      throw error;
    }
  }
  
  /**
   * Validate a limit order against symbol constraints
   */
  private validateLimitOrder(order: CreateOrderRequest, symbolInfo: any): void {
    if (!order.price) {
      throw new Error('Price is required for limit orders');
    }
    
    if (!order.quantity) {
      throw new Error('Quantity is required for limit orders');
    }
    
    // Validate price precision
    if (!PricingUtil.isValidPrice(
      order.price,
      '0.00000001', // Minimum price (this would be from symbol info in real system)
      '1000000', // Maximum price (this would be from symbol info in real system)
      symbolInfo.pricePrecision
    )) {
      throw new Error(`Invalid price. Must have at most ${symbolInfo.pricePrecision} decimal places`);
    }
    
    // Validate quantity precision
    if (!PricingUtil.isValidQuantity(
      order.quantity,
      symbolInfo.minQuantity,
      symbolInfo.maxQuantity,
      symbolInfo.quantityPrecision
    )) {
      throw new Error(`Invalid quantity. Must be between ${symbolInfo.minQuantity} and ${symbolInfo.maxQuantity} and have at most ${symbolInfo.quantityPrecision} decimal places`);
    }
    
    // Validate minimum notional value
    if (!PricingUtil.meetsMinimumNotional(
      order.price,
      order.quantity,
      symbolInfo.minNotional
    )) {
      throw new Error(`Order value must be at least ${symbolInfo.minNotional}`);
    }
  }
  
  /**
   * Generate a unique order ID
   */
  private generateOrderId(): string {
    return `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  /**
   * Simulate order processing (in a real system, this would be handled by a matching engine)
   */
  private async processOrderSimulation(order: Order): Promise<void> {
    try {
      // For demo purposes, simulate a market order being filled immediately
      // and a limit order being partially filled
      
      const db = getDb();
      const collection = db.collection<Order>(this.ordersCollection);
      
      if (order.type === 'market') {
        // For market orders, simulate complete fill
        const orderBook = await this.marketService.getOrderBook(order.symbol);
        let price: string;
        
        if (order.side === 'buy') {
          // For buy orders, take the lowest ask price
          price = orderBook.asks[0]?.price || '0';
        } else {
          // For sell orders, take the highest bid price
          price = orderBook.bids[0]?.price || '0';
        }
        
        // Create a fill
        const fill = {
          price,
          quantity: order.quantity,
          time: new Date()
        };
        
        // Update the order status
        const updatedOrder = await collection.findOneAndUpdate(
          { _id: order._id },
          {
            $set: {
              status: 'filled',
              executedQty: order.quantity,
              cummulativeQuoteQty: PricingUtil.calculateTotal(price, order.quantity),
              fills: [fill],
              updateTime: new Date()
            }
          },
          { returnDocument: 'after' }
        );
        
        if (updatedOrder) {
          // Record the trade
          await this.recordTrade(updatedOrder, fill);
          
          // Publish order filled event
          await this.publishOrderEvent('spot.order.filled', updatedOrder);
        }
      } else if (order.type === 'limit') {
        // For limit orders, simulate a partial fill (50%)
        const partialQuantity = PricingUtil.formatQuantity(
          new Decimal(order.quantity).mul(0.5).toString(), 
          8
        );
        
        // Create a fill
        const fill = {
          price: order.price!,
          quantity: partialQuantity,
          time: new Date()
        };
        
        // Update the order status
        const updatedOrder = await collection.findOneAndUpdate(
          { _id: order._id },
          {
            $set: {
              status: 'partially_filled',
              executedQty: partialQuantity,
              cummulativeQuoteQty: PricingUtil.calculateTotal(order.price!, partialQuantity),
              fills: [fill],
              updateTime: new Date()
            }
          },
          { returnDocument: 'after' }
        );
        
        if (updatedOrder) {
          // Record the trade
          await this.recordTrade(updatedOrder, fill);
          
          // Publish order updated event
          await this.publishOrderEvent('spot.order.updated', updatedOrder);
        }
      }
    } catch (error) {
      console.error(`Failed to process order simulation:`, error);
      // Continue since this is just a simulation
    }
  }
  
  /**
   * Record a trade from an order fill
   */
  private async recordTrade(order: Order, fill: any): Promise<void> {
    try {
      const trade: Omit<Trade, '_id'> = {
        symbol: order.symbol,
        price: fill.price,
        quantity: fill.quantity,
        quoteQuantity: PricingUtil.calculateTotal(fill.price, fill.quantity),
        time: fill.time || new Date(),
        isBuyerMaker: order.side === 'sell', // If order side is sell, buyer is the maker
        isBestMatch: true
      };
      
      await this.marketService.recordTrade(trade);
    } catch (error) {
      console.error(`Failed to record trade:`, error);
      // Continue even if trade recording fails
    }
  }
  
  /**
   * Publish order events to Redis
   */
  private async publishOrderEvent(eventType: string, order: Order): Promise<void> {
    try {
      const redis = getRedisClient();
      
      const payload = JSON.stringify({
        eventType,
        data: order,
        timestamp: new Date()
      });
      
      await redis.publish('spot-events', payload);
    } catch (error) {
      console.error(`Failed to publish order event:`, error);
      // Continue even if event publishing fails
    }
  }
} 