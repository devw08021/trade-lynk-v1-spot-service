import Pair from '@/models/schema/pair';
import SpotOrder from '@/models/schema/order';
import TradeHistory from '@/models/schema/trades';
import isEmpty from '@/lib/isEmpty';
import { paginationQuery } from '@/utils/general';
import { socketEmitAll, socketEmitOne } from '@/config/socketIO';
import { redis } from '@/config/redis.js';
import mongoose from 'mongoose';

const { Types } = mongoose;

const safeParse = (v) => {
  try { return JSON.parse(v); } catch { return null; }
};

const parseRedisHash = (obj) => {
  if (!obj) return [];
  const arr = [];
  for (const v of Object.values(obj)) {
    const parsed = safeParse(v);
    if (parsed !== null) arr.push(parsed);
  }
  return arr;
};

const filterByPair = (arr, pairId) =>
  arr.filter((x) => String(x.pairId) === String(pairId));

const sortByCreatedAtDesc = (arr) =>
  arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const sortByOrderDateDesc = (arr) =>
  arr.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

class SpotController {

  async decryptTradeOrder(c,next) {
    try {
      const body = await c.req.json();
      const token = decryptObject(body.token);
      c.set('body', token);
      await next();
    } catch (err) {
      return c.json({ status: false, message: 'Something Wrong' }, 500);
    }
  }
  // GET /get-trends
  async getTrends(c) {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const data = await TradeHistory.aggregate([
        { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
        { $group: { _id: '$pairId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const result = Array.isArray(data) ? data.map((d) => d._id.toString()) : [];
      return c.json({ success: true, result }, 200);
    } catch {
      return c.json({ success: false, message: 'Something went wrong' }, 500);
    }
  }

  // POST /depth-chart  (TODO: dependencies not present)
  async getDepthData(c) {
    return c.json({ success: false, message: 'Not implemented' }, 501);
  }

  // GET /recent-trade/:pairId
  async getRecentTrade(c) {
    try {
      const { pairId } = c.req.param();
      const pair = await Pair.findById(pairId).lean();

      if (!pair) return c.json({ success: false }, 404);

      // For local liquidity (previously "bot"), use Redis tradeHistory
      const tradesObj = await redis.hgetAll(`tradeHistory_${pair._id}`);
      let recent = parseRedisHash(tradesObj);
      recent = recent.sort((a, b) => b.createdAt - a.createdAt).splice(0, 25);

      return c.json({ success: true, result: recent || [] }, 200);
    } catch (err) {
      return c.json({ success: false }, 500);
    }
  }

  // GET /market-price/:pairId
  async getMarketPrice(c) {
    try {
      const { pairId } = c.req.param();
      const pair = await Pair.findById(pairId, { marketPrice: 1 }).lean();
      if (!pair) return c.json({ success: false }, 404);
      return c.json({ success: true, result: pair.marketPrice }, 200);
    } catch {
      return c.json({ success: false }, 500);
    }
  }

  // SOCKET helper (kept for parity)
  async getTradeHistorySocket(userId, pairId) {
    try {
      const raw = await redis.hgetAll(`tradeHistory_${pairId}`);
      let tradeDoc = parseRedisHash(raw);
      tradeDoc = tradeDoc
        .filter((x) => String(x.buyUserId) === String(userId) || String(x.sellUserId) === String(userId))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);

      const result = {
        pairId,
        data: tradeDoc,
        count: tradeDoc.length,
        currentPage: 1,
        nextPage: false,
        limit: 10,
      };
      socketEmitOne('tradeHistory', result, userId);
      return true;
    } catch {
      return false;
    }
  }

  // GET /trade-history/:pairId (auth)
  async getTradeHistory(c) {
    try {
      const user = c.get('user');
      const { pairId } = c.req.param();
      const pagination = paginationQuery(c.req.query());

      const raw = await redis.hgetAll(`tradeHistory_${pairId}`);
      let tradeDoc = parseRedisHash(raw).filter(
        (x) => String(x.buyUserId) === String(user.userId) || String(x.sellUserId) === String(user.userId)
      );
      tradeDoc = tradeDoc.sort((a, b) => b.createdAt - a.createdAt);

      const count = tradeDoc.length;
      tradeDoc = tradeDoc.slice(pagination.skip, pagination.skip + pagination.limit);

      return c.json(
        {
          success: true,
          result: {
            data: !isEmpty(tradeDoc) ? tradeDoc : [],
            count,
            currentPage: pagination.page,
            nextPage: count > pagination.skip + tradeDoc.length,
            limit: pagination.limit,
          },
        },
        200
      );
    } catch {
      return c.json({ success: false }, 500);
    }
  }

  // GET /open-order/:pairId (auth)
  async getOpenOrder(c) {
    try {
      const user = c.get('user');
      const { pairId } = c.req.param();
      const pagination = paginationQuery(c.req.query());

      const filter = {
        userId: new Types.ObjectId(user.userId),
        status: { $in: ['open', 'pending', 'conditional'] },
      };
      if (Types.ObjectId.isValid(pairId)) filter.pairId = new Types.ObjectId(pairId);

      const count = await SpotOrder.countDocuments(filter);
      let data = await SpotOrder.find(filter, {
        orderDate: 1,
        firstCurrency: 1,
        secondCurrency: 1,
        orderType: 1,
        buyorsell: 1,
        price: 1,
        quantity: 1,
        filledQuantity: 1,
        orderValue: 1,
        pairId: 1,
      })
        .sort({ orderDate: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean();

      // prioritize requested pairId on top
      data = data.sort((a, b) => {
        if (String(a.pairId) === String(pairId) && String(b.pairId) !== String(pairId)) return -1;
        if (String(a.pairId) !== String(pairId) && String(b.pairId) === String(pairId)) return 1;
        return new Date(b.orderDate) - new Date(a.orderDate);
      });

      return c.json(
        {
          success: true,
          result: {
            data,
            count,
            currentPage: pagination.page,
            nextPage: count > pagination.skip + data.length,
            limit: pagination.limit,
          },
        },
        200
      );
    } catch (err) {
      return c.json({ success: false }, 500);
    }
  }

  // GET /filled-order/:pairId (auth)
  async getFilledOrder(c) {
    try {
      const user = c.get('user');
      const { pairId } = c.req.param();
      const pagination = paginationQuery(c.req.query());

      const match = {
        userId: new Types.ObjectId(user.userId),
        status: 'completed',
      };
      if (Types.ObjectId.isValid(pairId)) match.pairId = new Types.ObjectId(pairId);

      const count = await SpotOrder.countDocuments(match);
      const data = await SpotOrder.aggregate([
        { $match: match },
        { $sort: { _id: -1 } },
        { $skip: pagination.skip },
        { $limit: pagination.limit },
        {
          $project: {
            orderDate: {
              $dateToString: { date: '$orderDate', format: '%Y-%m-%d %H:%M' },
            },
            firstCurrency: 1,
            secondCurrency: 1,
            orderType: 1,
            buyorsell: 1,
            price: 1,
            quantity: 1,
            filledQuantity: 1,
            orderValue: 1,
          },
        },
      ]);

      return c.json(
        {
          success: true,
          result: {
            count,
            currentPage: pagination.page,
            nextPage: count > pagination.skip + data.length,
            limit: pagination.limit,
            data,
          },
        },
        200
      );
    } catch {
      return c.json({ success: false }, 500);
    }
  }

  // GET /order-history/:pairId (auth)
  async getOrderHistory(c) {
    try {
      const user = c.get('user');
      const { pairId } = c.req.param();
      const pagination = paginationQuery(c.req.query());

      // From Mongo (orders collection acts as order history)
      const matchOpen = {
        userId: new Types.ObjectId(user.userId),
        status: { $in: ['open', 'pending', 'cancel', 'completed', 'conditional'] },
      };
      if (Types.ObjectId.isValid(pairId)) matchOpen.pairId = new Types.ObjectId(pairId);

      const count = await SpotOrder.countDocuments(matchOpen);
      const data = await SpotOrder.find(matchOpen, {
        orderDate: 1,
        firstCurrency: 1,
        secondCurrency: 1,
        orderType: 1,
        buyorsell: 1,
        price: 1,
        quantity: 1,
        filledQuantity: 1,
        orderValue: 1,
      })
        .sort({ orderDate: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean();

      return c.json(
        {
          success: true,
          result: {
            data,
            count,
            currentPage: pagination.page,
            nextPage: count > pagination.skip + data.length,
            limit: pagination.limit,
          },
        },
        200
      );
    } catch (err) {
      return c.json({ success: false }, 500);
    }
  }

  async getOpenOrderSocket(userId, pairId) {
    try {
      const match = {
        userId: new Types.ObjectId(userId),
        status: { $in: ['open', 'pending', 'conditional'] },
      };
      if (Types.ObjectId.isValid(pairId)) match.pairId = new Types.ObjectId(pairId);

      let data = await SpotOrder.find(match, {
        orderDate: 1,
        firstCurrency: 1,
        secondCurrency: 1,
        orderType: 1,
        buyorsell: 1,
        price: 1,
        quantity: 1,
        filledQuantity: 1,
        orderValue: 1,
        pairId: 1,
      })
        .sort({ orderDate: -1 })
        .limit(50)
        .lean();

      data = data.sort((a, b) => {
        if (String(a.pairId) === String(pairId) && String(b.pairId) !== String(pairId)) return -1;
        if (String(a.pairId) !== String(pairId) && String(b.pairId) === String(pairId)) return 1;
        return new Date(b.orderDate) - new Date(a.orderDate);
      });

      socketEmitOne('openOrder', { pairId, data, count: data.length }, userId);
      return true;
    } catch {
      return false;
    }
  }

  async getFilledOrderSocket(userId, pairId) {
    try {
      const match = {
        userId: new Types.ObjectId(userId),
        status: 'completed',
      };
      if (Types.ObjectId.isValid(pairId)) match.pairId = new Types.ObjectId(pairId);

      const count = await SpotOrder.countDocuments(match);
      const data = await SpotOrder.aggregate([
        { $match: match },
        { $sort: { _id: -1 } },
        { $limit: 10 },
        {
          $project: {
            orderDate: { $dateToString: { date: '$orderDate', format: '%Y-%m-%d %H:%M' } },
            firstCurrency: 1,
            secondCurrency: 1,
            orderType: 1,
            buyorsell: 1,
            price: 1,
            quantity: 1,
            filledQuantity: 1,
            orderValue: 1,
          },
        },
      ]);

      socketEmitOne(
        'filledOrder',
        { pairId, count, currentPage: 1, nextPage: count > data.length, limit: 10, data },
        userId
      );
      return true;
    } catch {
      return false;
    }
  }

  async getOrderHistorySocket(userId, pairId) {
    try {
      const match = {
        userId: new Types.ObjectId(userId),
        status: { $in: ['open', 'pending', 'cancel', 'completed', 'conditional'] },
      };
      if (Types.ObjectId.isValid(pairId)) match.pairId = new Types.ObjectId(pairId);

      const count = await SpotOrder.countDocuments(match);
      const data = await SpotOrder.find(match, {
        orderDate: 1,
        firstCurrency: 1,
        secondCurrency: 1,
        orderType: 1,
        buyorsell: 1,
        price: 1,
        quantity: 1,
        filledQuantity: 1,
        orderValue: 1,
      })
        .sort({ orderDate: -1 })
        .limit(10)
        .lean();

      socketEmitOne(
        'orderHistory',
        { pairId, data, count, currentPage: 1, nextPage: count > data.length, limit: 10 },
        userId
      );
      return true;
    } catch {
      return false;
    }
  }

  async orderBookData ({ pairId }) {
    try {
      let spotPairData = await FetchpairData(pairId);
      let decimalval = 0;
      let ordeBookData = {};
      if (spotPairData.botstatus != "bot") {
        return;
      }
      let buyOrders = await hgetall("buyOrders" + pairId);
  
      let sellOrders = await hgetall("sellOrders" + pairId);
      ordeBookData.buyOrders = buyOrders
        ? Object.entries(buyOrders).map((e) => ({ price: e[0], quantity: e[1] }))
        : [];
      ordeBookData.sellOrders = sellOrders
        ? Object.entries(sellOrders).map((e) => ({ price: e[0], quantity: e[1] }))
        : [];
      // let ordeBookData = await OrderBook.findOne({ pairId: pairId });
      if (ordeBookData.buyOrders || ordeBookData.sellOrders) {
        let buyOrderData =
          ordeBookData.buyOrders.length > 0
            ? ordeBookData.buyOrders.sort((a, b) => b.price - a.price)
            : [];
        let sellOrderData =
          ordeBookData.sellOrders.length > 0
            ? ordeBookData.sellOrders.sort((a, b) => a.price - b.price)
            : [];
        let buyOrderList = [],
          sellOrderList = [];
        if (buyOrderData.length > 0) {
          let sumamount = 0;
          for (let i = 0; i < buyOrderData.length; i++) {
            decimalval = minTwoDigits(spotPairData.firstFloatDigit);
            let quantity = parseFloat(buyOrderData[i].quantity / decimalval);
            sumamount += parseFloat(quantity);
            if (
              buyOrderData[i]?.price > 0 &&
              buyOrderData[i]?.price != "market"
            ) {
              buyOrderList.push({
                _id: buyOrderData[i].price,
                quantity: buyOrderData[i].quantity / decimalval,
                total: sumamount,
              });
            }
          }
        }
  
        if (sellOrderData.length > 0) {
          let sumamount = 0;
          for (let i = 0; i < sellOrderData.length; i++) {
            decimalval = minTwoDigits(spotPairData.firstFloatDigit);
            let quantity = parseFloat(sellOrderData[i].quantity / decimalval);
            sumamount += parseFloat(quantity);
            if (
              sellOrderData[i]?.price > 0 &&
              sellOrderData[i]?.price != "market"
            ) {
              sellOrderList.push({
                _id: sellOrderData[i].price,
                quantity: sellOrderData[i].quantity / decimalval,
                total: sumamount,
              });
            }
          }
        }
        await SpotPair.findOneAndUpdate(
          { _id: pairId },
          {
            $set: {
              last_ask: sellOrderList[0]?._id,
              last_bid: buyOrderList[0]?._id,
            },
          }
        );
        return {
          buyOrder: buyOrderList.splice(0, 20),
          sellOrder: sellOrderList.splice(0, 20),
        };
      } else {
        return {
          buyOrder: [],
          sellOrder: [],
        };
      }
    } catch (err) {
      console.log(err, "---1979");
      return {
        buyOrder: [],
        sellOrder: [],
      };
    }
  };
}

export default SpotController;