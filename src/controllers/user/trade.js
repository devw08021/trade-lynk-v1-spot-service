export const updateOrderBook = async (newOrder, pairId, firstFloatDigit) => {
  try {
    let decimalval = minTwoDigits(firstFloatDigit);
    let quntitydecimal = newOrder.quantity * decimalval;
    console.log(newOrder, "---------1089");
    await hincby(
      newOrder.buyorsell + "Orders" + pairId,
      newOrder.price,
      quntitydecimal
    );
    console.log(
      "--------------------------1095",
      newOrder.buyorsell + "Orders" + pairId,
      newOrder.price,
      quntitydecimal
    );
    getOrderBookSocket(pairId);
    return true;
  } catch (err) {
    console.log(err, "------1099");
    return false;
  }
};
export const newOrderHistory = async (orderData) => {
  try {
    let adminLiq = await hget("admin_liquidity", "liquidation");
    adminLiq = JSON.parse(adminLiq);
    console.log(orderData, "-------1135");
    let orderHistoryDetails = {
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
        orderData.orderType == "market" ? orderData.amount : orderData.quantity,
      price:
        adminLiq._id.toString() == orderData.userId.toString()
          ? orderData.price
          : orderData.orderType == "market"
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
      orderDate: orderData.orderDate,
      userCode: orderData.userCode,
    };
    SpotOrder.findOneAndUpdate(
      { _id: orderData._id },
      {
        $set: orderHistoryDetails,
        $setOnInsert: { orderCode: orderData?.orderCode },
      },
      { upsert: true }
    )
      .exec()
      .then(() => {})
      .catch((err) => {
        console.log(err);
      });
    return true;
  } catch (err) {
    console.log("err on newOrderHistory---", err);
  }
};


export const newTradeHistory = async ({
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
}) => {
  console.log(buyOrderData, "---buyOrderData");
  console.log(sellOrderData, "---sellOrderData");
  console.log(buyerFee, "buyerFee");
  console.log(sellerFee, "sellerFee");
  try {
    let PairId = buyOrderData.pairId
      ? buyOrderData.pairId
      : sellOrderData.pairId;
    let firsrCurrency = buyOrderData.firstCurrency
      ? buyOrderData.firstCurrency
      : sellOrderData.firstCurrency;
    let secondCurrecny = buyOrderData.secondCurrency
      ? buyOrderData.secondCurrency
      : sellOrderData.secondCurrency;
    let PairSymbole = firsrCurrency + secondCurrecny;
    let data = {
      pairId: PairId,
      firstCurrency: firsrCurrency,
      secondCurrency: secondCurrecny,
      firstCurrencyId: buyOrderData.firstCurrencyId
        ? buyOrderData.firstCurrencyId
        : sellOrderData.firstCurrencyId,
      secondCurrencyId: buyOrderData.secondCurrencyId
        ? buyOrderData.secondCurrencyId
        : sellOrderData.secondCurrencyId,
      sellUserId: sellOrderData.userId,
      buyUserId: buyOrderData.userId,
      uniqueId: uniqueId,
      tradePrice: execPrice,
      tradeQty: execQuantity,
      buyUserCode: buyOrderData.userCode ? buyOrderData.userCode : "",
      sellUserCode: sellOrderData.userCode ? sellOrderData.userCode : "",
      buyeOrderPrice: parseFloat(
        !isEmpty(buyOrderData.price) && buyOrderData.price != "market"
          ? buyOrderData.price
          : 0
      ),
      sellerOrderPrice: parseFloat(
        !isEmpty(sellOrderData) && sellOrderData.price != "market"
          ? sellOrderData.price
          : 0
      ),
      buyerFee: buyerFee.toString(),
      sellOrderType: sellOrderData.orderType
        ? sellOrderData.orderType
        : "Liquidity",
      buyOrderType: buyOrderData.orderType
        ? buyOrderData.orderType
        : "Liquidity",
      sellerFee: sellerFee.toString(),
      isMaker: Maker,
      status: "completed",
      createdAt: Date.now(),
      orderValue: execPrice * execQuantity,
      pairName: PairSymbole,
      buyOrderId: buyOrderData._id ? buyOrderData._id : PairId,
      sellOrderId: sellOrderData._id ? sellOrderData._id : PairId,
      buyOrdCode: buyOrderData?.orderCode,
      sellOrdCode: sellOrderData?.orderCode,
      buyerFeeCurrency,
      buyerFeeCurrencyId,
      buyerOrgFee,
      buyerFeeExcRate,
      sellerFeeCurrency,
      sellerFeeCurrencyId,
      sellerFeeExcRate,
      sellerOrgFee,
    };
    console.log(data, "TradeHistory");
    let newCompletedTrade = new TradeHistory(data);
    await newCompletedTrade.save();

    if (!isEmpty(buyOrderData)) {
      const [isAff] = await hmget(
        "userSetting_" + buyOrderData.userId.toString(),
        ["isAff"]
      );
      if (isAff == "true") {
        distributeBrokerage({
          refereeId: buyOrderData.userId,
          orderId: buyOrderData._id ? buyOrderData._id : PairId,
          currencyId: buyerFeeCurrencyId,
          amount: newCompletedTrade.buyerFee,
        });
      }

      updateSTV({
        userId: buyOrderData.userId,
        amount: execQuantity,
        currencyId: buyOrderData.firstCurrencyId,
      });

      saveAdminprofit({
        userId: newCompletedTrade.buyUserId,
        ordertype: newCompletedTrade.buyOrderType,
        pair:
          newCompletedTrade.firstCurrency +
          "/" +
          newCompletedTrade.secondCurrency,
        fee: newCompletedTrade.buyerFee,
        coin: newCompletedTrade.firstCurrency,
      });
    }
    if (!isEmpty(sellOrderData)) {
      const [isAff] = await hmget(
        "userSetting_" + sellOrderData.userId.toString(),
        ["isAff"]
      );
      if (isAff == "true") {
        distributeBrokerage({
          refereeId: sellOrderData.userId,
          orderId: sellOrderData._id ? sellOrderData._id : PairId,
          currencyId: sellerFeeCurrencyId,
          amount: newCompletedTrade.sellerFee,
        });
      }

      updateSTV({
        userId: sellOrderData.userId,
        amount: execPrice * execQuantity,
        currencyId: sellOrderData.secondCurrencyId,
      });

      saveAdminprofit({
        userId: newCompletedTrade.sellUserId,
        ordertype: newCompletedTrade.sellOrderType,
        pair:
          newCompletedTrade.firstCurrency +
          "/" +
          newCompletedTrade.secondCurrency,
        fee: newCompletedTrade.sellerFee,
        coin: newCompletedTrade.secondCurrency,
      });
    }

    await hset("tradeHistory_" + PairId, uniqueId, data);
    // await hset(
    //   "referralCommisonAdd",
    //   newCompletedTrade._id.toString(),
    //   newCompletedTrade
    // );
    setDepthHist(
      {
        PairId,
        tradePrice: execPrice,
        tradeQty: execQuantity,
      },
      Maker
    );
    if (buyOrderData.userId) {
      await getTradeHistorySocket(
        buyOrderData.userId.toString(),
        PairId.toString()
      );
    }

    if (sellOrderData.userId) {
      await getTradeHistorySocket(
        sellOrderData.userId.toString(),
        PairId.toString()
      );
    }

    recentTradeSocket(PairId);

    let getDoc = await hget("spotPairdata", PairId.toString());

    getDoc = JSON.parse(getDoc);

    if (getDoc) {
      getDoc["prevMarkPrice"] = getDoc.markPrice;
      getDoc.markPrice = execPrice;
      hset("spotPairdata", PairId.toString(), getDoc);
      SpotPair.updateOne(
        { _id: PairId },
        { markPrice: execPrice, prevMarkPrice: getDoc.markPrice },
        { upsert: true }
      ).exec();
    }
    marketPriceSocket(PairId);
    return true;
  } catch (err) {
    console.log("newTradeHistorynewTradeHistoryERRRRRRRRR", err);
  }
};

export const createTradeHistory = async (order) => {
  let checkOrder = order;
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
  let retriveValue = checkOrder.orderType == "limit" ? orderValue : marketValue;
  retriveValue = parseFloat(retriveValue);

  if (checkOrder.liquidityType == "off")
    if (checkOrder.orderType != "market") {
      editOrderBook({
        buyorsell: checkOrder.buyorsell,
        price: checkOrder.price,
        minusQuantity: checkOrder.quantity,
        pairId: checkOrder.pairId,
        firstFloatDigit: checkOrder.firstFloatDigit,
      });
    }
  let userWallet = await hincbyfloat(
    "walletbalance_spot",
    checkOrder.userId + "_" + currencyId,
    retriveValue
  );
  await hset("orderHistory_" + checkOrder.userId, checkOrder._id, checkOrder);

  let beforeBalanmce = userWallet - parseFloat(retriveValue);
  passbook({
    userId: checkOrder.userId,
    coin:
      checkOrder.buyorsell == "buy"
        ? checkOrder.secondCurrency
        : checkOrder.firstCurrency,
    currencyId: currencyId,
    tableId: checkOrder._id,
    beforeBalance: beforeBalanmce.toFixed(8),
    afterBalance: userWallet,
    amount: retriveValue,
    type: "order_Cancel",
    category: "credit",
  });
};