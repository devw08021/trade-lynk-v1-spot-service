// src/controllers/user/trade.service.js
import {
  hIncBy,
  hgetField,
  hicByFloat,
  hmgetFields,
  hsetField,
} from "@/config/redis";
import { saveAdminprofit } from "@/grpc/services/adminService";
import { getRepository } from "@/models/repositoryFactory";
import { PairModel, SpotOrder, TradesModel } from "@/models/schema";

export default class TradeService {
  constructor(deps = {}) {
    this.redis = {
      hIncBy,
      hicByFloat,
      hsetField,
      hgetField,
      hmgetFields,
    };

    // Models
    this.spotOrderRepo = getRepository(SpotOrder);
    this.pairRepo = getRepository(PairModel);
    this.tradeHistoryRepo = getRepository(TradesModel);

    this.minTwoDigits =
      deps.minTwoDigits || ((n) => Math.pow(10, Number(n) || 0));
    this.isEmpty = deps.isEmpty || ((v) => v === undefined || v === null);
    this.setDepthHist = deps.setDepthHist || (() => {});
    this.editOrderBook = deps.editOrderBook || (() => {});
    this.passbook = deps.passbook || (() => {});

    this.sockets = {
      getOrderBookSocket: deps.getOrderBookSocket || (() => {}),
      getTradeHistorySocket: deps.getTradeHistorySocket || (() => {}),
      recentTradeSocket: deps.recentTradeSocket || (() => {}),
      marketPriceSocket: deps.marketPriceSocket || (() => {}),
    };
  }

  async updateOrderBook(newOrder, pairId, firstFloatDigit) {
    try {
      const decimalval = this.minTwoDigits(firstFloatDigit);
      const quantityDecimal = Number(newOrder.quantity) * Number(decimalval);

      await this.redis.hIncBy(
        `${newOrder.buyorsell}Orders${pairId}`,
        String(newOrder.price),
        quantityDecimal
      );

      getOrderBookSocket(pairId);
      return true;
    } catch (err) {
      console.log("updateOrderBook error:", err);
      return false;
    }
  }

  // order upsert equivalent
  async newOrderHistory(orderData) {
    try {
      // Note: hgetField returns parsed JSON from redis.js
      let adminLiq = await this.redis.hgetField(
        "admin_liquidity",
        "liquidation"
      );

      const orderHistoryDetails = {
        _id: orderData._id,
        userId: orderData.userId,
        pairId: orderData.pairId,
        firstCurrencyId: orderData.firstCurrencyId,
        firstCurrency: orderData.firstCurrency,
        firstFloatDigit: orderData.firstFloatDigit,
        secondCurrencyId: orderData.secondCurrencyId,
        secondCurrency: orderData.secondCurrency,
        secondFloatDigit: orderData.secondFloatDigit,
        makerFee: orderData.makerFee,
        takerFee: orderData.takerFee,
        quantity:
          orderData.orderType === "market"
            ? orderData.amount
            : orderData.quantity,
        price:
          adminLiq &&
          adminLiq._id?.toString?.() === orderData.userId?.toString?.()
            ? orderData.price
            : orderData.orderType === "market"
            ? orderData.orderValue
            : orderData.price,
        orderValue: orderData.orderValue,
        pairName: orderData.pairName,
        orderType: orderData.orderType,
        buyorsell: orderData.buyorsell,
        openQuantity: orderData.openQuantity,
        averagePrice: orderData.averagePrice,
        openOrderValue: orderData.openOrderValue,
        filledQuantity: orderData.filledQuantity,
        flag: orderData.flag,
        status: orderData.status,
        orderDate: orderData.orderDate,
        liquidityType: orderData.liquidityType,
        liquidityId: orderData.liquidityId,
        isLiquidityError: orderData.isLiquidityError,
        isLiquidity: orderData.isLiquidity,
        updatedAt: Date.now(),
        userCode: orderData.userCode,
      };

      await this.spotOrderRepo
        .findOneAndUpdate(
          { _id: orderData._id },
          {
            $set: orderHistoryDetails,
            $setOnInsert: { orderCode: orderData?.orderCode },
          },
          { upsert: true }
        )
        .exec();

      return true;
    } catch (err) {
      console.log("newOrderHistory error:", err);
      return false;
    }
  }

  // trade completion equivalent (mapped to current trades schema)
  async newTradeHistory({
    buyOrderData,
    sellOrderData,
    uniqueId,
    execPrice,
    Maker,
    buyerFee,
    sellerFee,
    execQuantity,
    ordertype,
    buyerFeeCurrency,
    buyerFeeCurrencyId,
    buyerOrgFee,
    buyerFeeExcRate,
    sellerFeeCurrency,
    sellerFeeCurrencyId,
    sellerOrgFee,
    sellerFeeExcRate,
  }) {
    try {
      const PairId = buyOrderData?.pairId || sellOrderData?.pairId;
      const baseSymbol =
        buyOrderData?.firstCurrency || sellOrderData?.firstCurrency || "";
      const quoteSymbol =
        buyOrderData?.secondCurrency || sellOrderData?.secondCurrency || "";

      const payload = {
        pairId: PairId,
        baseSymbol,
        quoteSymbol,
        baseId: buyOrderData?.firstCurrencyId || sellOrderData?.firstCurrencyId,
        quoteId:
          buyOrderData?.secondCurrencyId || sellOrderData?.secondCurrencyId,
        buyerId: buyOrderData?.userId,
        sellerId: sellOrderData?.userId,
        buyOrderId: buyOrderData?._id || PairId,
        sellOrderId: sellOrderData?._id || PairId,
        buyerCode: buyOrderData?.userCode || "",
        sellerCode: sellOrderData?.userCode || "",
        buyerPrice: parseFloat(
          buyOrderData?.price && buyOrderData?.price !== "market"
            ? buyOrderData.price
            : 0
        ),
        sellerPrice: parseFloat(
          sellOrderData?.price && sellOrderData?.price !== "market"
            ? sellOrderData.price
            : 0
        ),
        buyerFee: Number(buyerFee || 0),
        sellerFee: Number(sellerFee || 0),
        sellOrderType: sellOrderData?.orderType || "Liquidity",
        buyOrderType: buyOrderData?.orderType || "Liquidity",
        isMaker: String(!!Maker), // schema expects String
        tradePrice: Number(execPrice),
        tradeQty: Number(execQuantity),
        tradeOrderValue: Number(execPrice) * Number(execQuantity),
        status: "completed",
        liquidity: ordertype || "",

        // Not in schema but kept here for clarity; Mongoose will ignore if strict
        // buyerFeeCurrency, buyerFeeCurrencyId, buyerOrgFee, buyerFeeExcRate,
        // sellerFeeCurrency, sellerFeeCurrencyId, sellerOrgFee, sellerFeeExcRate,
        // uniqueId
      };

      const newCompletedTrade = await new this.tradeHistoryRepo(payload).save();

      // Buyer side post-processing
      if (!this.isEmpty(buyOrderData)) {
        const [isAff] = await this.redis.hmgetFields(
          `userSetting_${String(buyOrderData.userId)}`,
          "isAff"
        );
        // if (isAff === "true") {
        //   this.distributeBrokerage({
        //     refereeId: buyOrderData.userId,
        //     orderId: buyOrderData._id || PairId,
        //     currencyId: buyerFeeCurrencyId,
        //     amount: newCompletedTrade.buyerFee,
        //   });
        // }

        // this.updateSTV({
        //   userId: buyOrderData.userId,
        //   amount: execQuantity,
        //   currencyId: buyOrderData.firstCurrencyId,
        // });

        saveAdminprofit({
          userId: newCompletedTrade.buyerId,
          ordertype: newCompletedTrade.buyOrderType,
          pair: `${baseSymbol}/${quoteSymbol}`,
          fee: newCompletedTrade.buyerFee,
          coin: baseSymbol,
        });
      }

      // Seller side post-processing
      if (!this.isEmpty(sellOrderData)) {
        const [isAff] = await this.redis.hmgetFields(
          `userSetting_${String(sellOrderData.userId)}`,
          "isAff"
        );
        // if (isAff === "true") {
        //   this.distributeBrokerage({
        //     refereeId: sellOrderData.userId,
        //     orderId: sellOrderData._id || PairId,
        //     currencyId: sellerFeeCurrencyId,
        //     amount: newCompletedTrade.sellerFee,
        //   });
        // }

        // this.updateSTV({
        //   userId: sellOrderData.userId,
        //   amount: Number(execPrice) * Number(execQuantity),
        //   currencyId: sellOrderData.secondCurrencyId,
        // });

        saveAdminprofit({
          userId: newCompletedTrade.sellerId,
          ordertype: newCompletedTrade.sellOrderType,
          pair: `${baseSymbol}/${quoteSymbol}`,
          fee: newCompletedTrade.sellerFee,
          coin: quoteSymbol,
        });
      }

      // In-memory history
      if (PairId && uniqueId) {
        await this.redis.hsetField(`tradeHistory_${PairId}`, uniqueId, payload);
      }

      // Depth + sockets
      this.setDepthHist(
        { PairId, tradePrice: execPrice, tradeQty: execQuantity },
        Maker
      );

      if (buyOrderData?.userId) {
        await this.sockets.getTradeHistorySocket?.(
          String(buyOrderData.userId),
          String(PairId)
        );
      }
      if (sellOrderData?.userId) {
        await this.sockets.getTradeHistorySocket?.(
          String(sellOrderData.userId),
          String(PairId)
        );
      }

      this.sockets.recentTradeSocket?.(PairId);

      // Update pair market price
      if (PairId) {
        await this.pairRepo
          .update(
            { _id: PairId },
            { marketPrice: Number(execPrice) },
            { upsert: true }
          )
          .exec();
      }

      this.sockets.marketPriceSocket?.(PairId);
      return true;
    } catch (err) {
      console.log("newTradeHistory error:", err);
      return false;
    }
  }

  // cancel flow equivalent
  async createTradeHistory(order) {
    const checkOrder = { ...order, status: "cancel" };

    const currencyId =
      checkOrder.buyorsell === "buy"
        ? checkOrder.secondCurrencyId
        : checkOrder.firstCurrencyId;

    const orderValue =
      checkOrder.buyorsell === "buy"
        ? Number(checkOrder.price) * Number(checkOrder.quantity)
        : Number(checkOrder.quantity);

    const marketValue =
      checkOrder.orderType === "market" && checkOrder.buyorsell === "buy"
        ? Number(checkOrder.orderValue)
        : Number(checkOrder.amount);

    let retrieveValue =
      checkOrder.orderType === "limit" ? orderValue : marketValue;
    retrieveValue = parseFloat(retrieveValue);

    if (
      checkOrder.liquidityType === "off" &&
      checkOrder.orderType !== "market"
    ) {
      this.editOrderBook({
        buyorsell: checkOrder.buyorsell,
        price: checkOrder.price,
        minusQuantity: checkOrder.quantity,
        pairId: checkOrder.pairId,
        firstFloatDigit: checkOrder.firstFloatDigit,
      });
    }

    const userWallet = await this.redis.hicByFloat(
      "walletbalance_spot",
      `${checkOrder.userId}_${currencyId}`,
      retrieveValue
    );

    await this.redis.hsetField(
      `orderHistory_${checkOrder.userId}`,
      checkOrder._id,
      checkOrder
    );

    const beforeBalance = Number(userWallet) - Number(retrieveValue);
    this.passbook({
      userId: checkOrder.userId,
      coin:
        checkOrder.buyorsell === "buy"
          ? checkOrder.secondCurrency
          : checkOrder.firstCurrency,
      currencyId: currencyId,
      tableId: checkOrder._id,
      beforeBalance: Number(beforeBalance).toFixed(8),
      afterBalance: userWallet,
      amount: retrieveValue,
      type: "order_Cancel",
      category: "credit",
    });
  }
}
