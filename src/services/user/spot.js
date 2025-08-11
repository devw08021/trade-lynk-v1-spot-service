import {
  hgetField,
  hicByFloat,
  hsetField,
  hdelField,
  hIncBy,
} from "../../config/redis.js";
import { toFixedDown } from "../../utils/trunc.js";

export const cancelMarketOrder = async (tableId, orderId) => {
  try {
    let checkOrder = await hgetField(tableId, orderId);
    if (checkOrder) {
      checkOrder.status = "cancel";
      let currencyId =
        checkOrder.buyorsell == "buy"
          ? checkOrder.secondCurrencyId
          : checkOrder.firstCurrencyId;
      let orderValue =
        checkOrder.buyorsell == "buy"
          ? checkOrder.price * checkOrder.quantity
          : checkOrder.quantity;
      let marketValue =
        checkOrder.orderType == "market" && checkOrder.buyorsell == "buy"
          ? checkOrder.orderValue
          : checkOrder.amount;
      let retriveValue =
        checkOrder.orderType == "limit" ? orderValue : marketValue;
      retriveValue = parseFloat(retriveValue);
      if (checkOrder.orderType != "market") {
        updateBook({
          buyorsell: checkOrder.buyorsell,
          price: checkOrder.price,
          minusQuantity: checkOrder.quantity,
          pairId: checkOrder.pairId,
          firstFloatDigit: checkOrder.firstFloatDigit,
        });
      }
      let userWallet = await hicByFloat(
        "walletbalance_spot",
        checkOrder.userId + "_" + currencyId,
        retriveValue
      );

      await hsetField(
        "orderHist_" + checkOrder.userId,
        checkOrder._id,
        checkOrder
      );
      await hdelField(tableId, orderId);
      // getOpenOrderSocket(checkOrder.userId, checkOrder.pairId);
      // getOrderHistorySocket(checkOrder.userId, checkOrder.pairId);
      // newOrderHistory(checkOrder);

      // socketEmitOne(
      //     "updateTradeAsset",
      //     {
      //         currencyId: currencyId,
      //         spotBal: userWallet,
      //     },
      //     checkOrder.userId
      // );
      return true;
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const minTwoDigits = (n) => {
  let j = 1;
  for (let i = 0; i < n; i++) {
    j = j + "0";
  }
  return parseFloat(j);
};

export const updateBook = async ({
  buyorsell,
  price,
  minusQuantity,
  pairId,
  firstFloatDigit,
}) => {
  try {
    let decimalval = minTwoDigits(firstFloatDigit);
    let quntitydecimal = Math.round(minusQuantity * decimalval);
    quntitydecimal = toFixedDown(quntitydecimal, firstFloatDigit);
    await hIncBy(
      buyorsell == "buy" ? "b" : "s" + "Book" + pairId,
      price,
      -quntitydecimal
    );
    // getOrderBookSocket(pairId);
    return true;
  } catch (err) {
    console.log("--- err", err);
    return false;
  }
};

export const editOrderBook = async ({
  buyorsell,
  price,
  minusQuantity,
  pairId,
  firstFloatDigit,
}) => {
  try {
    let decimalval = minTwoDigits(firstFloatDigit);
    let quntitydecimal = Math.round(minusQuantity * decimalval);
    quntitydecimal = toFixedDown(quntitydecimal, firstFloatDigit);
    console.log(buyorsell, "--------------4532", quntitydecimal);
    await hIncBy(buyorsell + "Orders" + pairId, price, -quntitydecimal);
    getOrderBookSocket(pairId);
    return true;
  } catch (err) {
    console.log("---4537", err);
    return false;
  }
};

export const setDepthHist = async (item, type) => {
  let buyDepth = await lrange(`buy_depth_${item.PairId}`);
  let sellDepth = await lrange(`sell_depth_${item.PairId}`);
  if (!isEmpty(buyDepth)) {
    buyDepth = await getvalueObj(buyDepth);
  }
  if (!isEmpty(sellDepth)) {
    sellDepth = await getvalueObj(sellDepth);
  }
  if (type == "buy" && (buyDepth?.length < 21 || buyDepth == null)) {
    rpush(
      `buy_depth_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  } else if (buyDepth?.length >= 21) {
    lpop(`buy_depth_${item.PairId}`);
    rpush(
      `buy_depth_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  }
  if (type == "sell" && (sellDepth?.length < 21 || sellDepth == null)) {
    rpush(
      `sell_depth_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  } else if (sellDepth?.length >= 21) {
    lpop(`sell_depth_${item.PairId}`);
    rpush(
      `sell_depth_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  }
};
export const setDepthBinanceHist = async (item, type) => {
  let buyDepth = await lrange(`buy_depth_binance_${item.PairId}`);
  let sellDepth = await lrange(`sell_depth_binance_${item.PairId}`);
  if (!isEmpty(buyDepth)) {
    buyDepth = await getvalueObj(buyDepth);
  }
  if (!isEmpty(sellDepth)) {
    sellDepth = await getvalueObj(sellDepth);
  }
  if (type == "buy" && (buyDepth?.length < 21 || buyDepth == null)) {
    rpush(
      `buy_depth_binance_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  } else if (buyDepth?.length >= 21) {
    lpop(`buy_depth_binance_${item.PairId}`);
    rpush(
      `buy_depth_binance_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  }
  if (type == "sell" && (sellDepth?.length < 21 || sellDepth == null)) {
    rpush(
      `sell_depth_binance_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  } else if (sellDepth?.length >= 21) {
    lpop(`sell_depth_binance_${item.PairId}`);
    rpush(
      `sell_depth_binance_${item.PairId}`,
      JSON.stringify({ price: item.tradePrice, volume: item.tradeQty })
    );
  }
};
