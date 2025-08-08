import { hget, hincbyfloat, hset, hdel, hgetall } from '@/config/redis.js';
import { socketEmitOne } from '@/config/socketIO.js';
import { toFixedDown } from '@/utils/trunc.js';

export default class OrderPlacementController {

  async cancelOrder(req, res) {
    try {
      let data = decryptObject(req.body.id);
      let pairId = data.tableId.split("_")[1];
      if (isEmpty(data)) {
        return res
          .status(500)
          .json({ status: false, message: "Error on server" });
      }
      let checkOrder = await hget(data.tableId, data.orderId);
  
      if (tradePair == pairId) {
        return res.status(400).json({
          success: false,
          message: "Order has been excute processing ...",
        });
      }
      checkOrder = JSON.parse(checkOrder);
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
  
        await hincbyfloat(
          "walletbalance_spot_inOrder",
          checkOrder.userId + "_" + currencyId,
          -retriveValue
        );
        await hset(
          "orderHistory_" + checkOrder.userId,
          checkOrder._id,
          checkOrder
        );
        await hdel(data.tableId, data.orderId);
        getOpenOrderSocket(checkOrder.userId, checkOrder.pairId);
        getOrderHistorySocket(checkOrder.userId, checkOrder.pairId);
        newOrderHistory(checkOrder);
  
        // if (checkOrder.liquidityType == "wazirx") {
        //   let option = {
        //     symbol: checkOrder.pairName.toLowerCase(),
        //     side: checkOrder.buyorsell,
        //     type: checkOrder.orderType,
        //     quantity: checkOrder.quantity,
        //     price: checkOrder.price,
        //   };
        //   await wazirixCancelOrder(option, checkOrder.liquidityId);
        // }
        if (checkOrder.liquidityType == "binance") {
          await binanceCtrl.cancelOrder({
            firstCoin: checkOrder.firstCurrency,
            secondCoin: checkOrder.secondCurrency,
            binanceId: checkOrder.liquidityId,
          });
        }
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
  
        socketEmitOne(
          "updateTradeAsset",
          {
            currencyId: currencyId,
            spotBal: userWallet,
          },
          req.user.id
        );
        return res
          .status(200)
          .json({ status: true, message: "Order cancelled successfully" });
      }
  
      return res.status(400).json({ status: false, message: "Order not found" });
    } catch (err) {
      console.log("err: ", err);
      return res.status(500).json({ status: false, message: "Error occured" });
    }
  };
  /**
   * Main order placement method that routes to specific order types
   */
  async orderPlace(c) {
    try {
      const reqBody = await c.req.json();
      
      if (reqBody.orderType == "limit") {
        return await this.limitOrderPlace(c);
      } else if (reqBody.orderType == "market") {
        return await this.marketOrderPlace(c);
      }
      
      return c.json({
        status: false,
        message: "Invalid order type",
      }, 400);
    } catch (err) {
      console.log("orderPlace error:", err);
      return c.json({
        status: false,
        message: "Error occurred For the Interval_orderPlace_err",
      }, 400);
    }
  }

  /**
   * Handle limit order placement
   */
  async limitOrderPlace(c) {
    try {
      const reqBody = await c.req.json();
      const user = c.get("user");
      
      reqBody.price = parseFloat(reqBody.price);
      reqBody.quantity = parseFloat(reqBody.quantity);
      
      // Fetch pair data
      let spotPairData = await this.fetchPairData(reqBody.spotPairId);
      if (!spotPairData) {
        return c.json({ status: false, message: "Invalid Pair" }, 400);
      }
      
      // Validate pair status
      if (spotPairData.status != "active") {
        return c.json({ status: false, message: "Pair is not activated" }, 400);
      }

      // Determine maker status and average price
      let { makerStatus, avgPrice } = this.calculateMakerStatus(reqBody, spotPairData);

      // Validate quantity limits
      const quantityValidation = this.validateQuantity(reqBody.quantity, spotPairData);
      if (!quantityValidation.isValid) {
        return c.json(quantityValidation.response, 400);
      }

      // Validate price limits
      const priceValidation = this.validatePrice(reqBody.price, spotPairData);
      if (!priceValidation.isValid) {
        return c.json(priceValidation.response, 400);
      }

      // Validate binance-specific requirements
      if (spotPairData.botstatus == "binance") {
        const binanceValidation = await this.validateBinanceRequirements(reqBody, spotPairData);
        if (!binanceValidation.isValid) {
          return c.json(binanceValidation.response, 400);
        }
      }

      // Get currency ID and validate wallet
      let currencyId = this.getCurrencyId(reqBody.buyorsell, spotPairData);
      let usrWallet = await this.getUserWallet(user.userId, currencyId);
      
      if (usrWallet == null) {
        let createAsset = await this.updateUserWallet(user.userId);
        if (createAsset == false) {
          return c.json({
            status: false,
            message: "Error on server",
          }, 400);
        }
      }

      // Calculate order value and validate balance
      let orderValue = this.calculateOrderValue(reqBody, reqBody.buyorsell);
      usrWallet = parseFloat(usrWallet);
      
      if (usrWallet < orderValue) {
        return c.json({
          status: false,
          message: "Due to insufficient balance order cannot be placed",
        }, 400);
      }

      // Create order object
      const seqId = await this.getSequenceId("orderHistory");
      const newOpenOrder = this.createOrderObject(reqBody, spotPairData, user, seqId, makerStatus, avgPrice);

      // Update wallet balances
      let userbalance = await this.updateWalletBalance(user.userId, currencyId, -orderValue);
      await this.updateInOrderBalance(user.userId, currencyId, orderValue);

      // Handle insufficient balance scenario
      if (parseFloat(userbalance) < 0) {
        return await this.handleInsufficientBalance(c, userbalance, orderValue, currencyId, spotPairData, newOpenOrder);
      }

      // Process the order
      await this.processLimitOrder(newOpenOrder, reqBody, spotPairData, makerStatus, userbalance, orderValue);

      // Create passbook entry
      this.createPassbookEntry(user, spotPairData, newOpenOrder._id, parseFloat(userbalance) + orderValue, parseFloat(userbalance), orderValue, "spot_limit_orderPlace", "debit");

      return c.json({ status: true, message: "Your order placed successfully." });
    } catch (err) {
      console.log("limitOrderPlace error:", err);
      return c.json({ status: false, message: "Limit order match error" }, 400);
    }
  }

  /**
   * Handle market order placement
   */
  async marketOrderPlace(c) {
    try {
      const reqBody = await c.req.json();
      const user = c.get("user");
      
      console.log(reqBody, "------777");
      let side = reqBody.buyorsell == "buy" ? "sell" : "buy";
      
      // Fetch pair data
      let spotPairData = await this.fetchPairData(reqBody.spotPairId);
      if (!spotPairData) {
        return c.json({ status: false, message: "Invalid Pair" }, 400);
      }
      
      if (spotPairData.status != "active") {
        return c.json({ status: false, message: "Pair is not activated" }, 400);
      }

      // Format quantity
      reqBody.quantity = toFixedDown(parseFloat(reqBody.quantity), spotPairData.firstFloatDigit);

      // Validate order value for buy orders
      if (reqBody.buyorsell == "buy") {
        const orderValueValidation = this.validateOrderValue(reqBody, spotPairData);
        if (!orderValueValidation.isValid) {
          return c.json(orderValueValidation.response, 400);
        }
      }

      // Validate binance requirements for buy orders
      if (reqBody.buyorsell == "buy" && spotPairData.botstatus == "binance") {
        const binanceValidation = await this.validateBinanceMarketRequirements(reqBody, spotPairData);
        if (!binanceValidation.isValid) {
          return c.json(binanceValidation.response, 400);
        }
      }

      // Validate quantity for sell orders
      if (reqBody.buyorsell == "sell") {
        const quantityValidation = this.validateSellQuantity(reqBody, spotPairData);
        if (!quantityValidation.isValid) {
          return c.json(quantityValidation.response, 400);
        }
      }

      // Get currency ID and validate wallet
      let currencyId = this.getCurrencyId(reqBody.buyorsell, spotPairData);
      let usrWallet = await this.getUserWallet(user.userId, currencyId);
      
      if (usrWallet == null) {
        let createAsset = await this.updateUserWallet(user.userId);
        if (createAsset == false) {
          return c.json({
            status: false,
            message: "Error on server",
          }, 400);
        }
      }

      let balance = parseFloat(usrWallet);
      let orderValue = 0;

      // Check order book for different bot statuses
      if (spotPairData.botstatus == "off") {
        const orderBookValidation = await this.validateOrderBook(c, side, spotPairData);
        if (!orderBookValidation.isValid) {
          return c.json(orderBookValidation.response, 400);
        }
      }

      if (spotPairData.botstatus == "bot") {
        const botValidation = await this.validateBotOrderBook(c, side, spotPairData);
        if (!botValidation.isValid) {
          return c.json(botValidation.response, 400);
        }
      }

      // Calculate order value
      orderValue = this.calculateMarketOrderValue(reqBody, reqBody.buyorsell);
      orderValue = parseFloat(orderValue);
      
      if (reqBody.buyorsell == "buy") {
        let oValue = orderValue / spotPairData.markPrice;
        orderValue = toFixedDown(oValue, spotPairData.firstFloatDigit) * spotPairData.markPrice;
        orderValue = parseFloat(orderValue);
      }

      usrWallet = parseFloat(usrWallet);
      if (usrWallet < orderValue) {
        return c.json({
          status: false,
          message: "Due to insufficient balance order cannot be placed",
        }, 400);
      }

      // Create order object
      let cost = reqBody.buyorsell == "buy" ? "orderValue" : "amount";
      const seqId = await this.getSequenceId("orderHistory");
      let newOpenOrder = this.createMarketOrderObject(reqBody, spotPairData, user, seqId, cost, orderValue, balance, usrWallet);

      // Update wallet balance
      let userbalance = await this.updateWalletBalance(user.userId, currencyId, -orderValue);
      
      if (parseFloat(userbalance) < 0) {
        return await this.handleMarketInsufficientBalance(c, userbalance, orderValue, currencyId, spotPairData, newOpenOrder);
      }

      // Store order
      await this.storeOrder(newOpenOrder);

      // Handle liquidity for binance orders
      if (newOpenOrder.liquidityType == "binance") {
        const liquidityResult = await this.handleBinanceLiquidity(newOpenOrder, spotPairData, c, balance, userbalance, orderValue);
        if (!liquidityResult.status) {
          return c.json(liquidityResult, 400);
        }
      }

      let afterBalance = userbalance;

      // Emit socket updates
      this.emitTradeAssetUpdate(currencyId, afterBalance, user.userId);
      this.getOrderHistorySocket(newOpenOrder.userId, newOpenOrder.pairId);

      // Handle admin liquidity for off bot status
      if (spotPairData.botstatus == "off") {
        await this.handleAdminLiquidity(newOpenOrder, reqBody, spotPairData);
      }

      // Create order history and passbook entry
      newOpenOrder.orderDate = new Date();
      await this.newOrderHistory(newOpenOrder);
      this.createPassbookEntry(user, spotPairData, newOpenOrder._id, balance, afterBalance, orderValue, "spot_market_orderPlace", "debit");

      return c.json({ status: true, message: "Your order placed successfully." });
    } catch (err) {
      console.log("marketOrderPlace error:", err);
      return c.json({ status: false, message: "Market order match error" }, 500);
    }
  }

  // Helper methods

  async fetchPairData(spotPairId) {
    // Implementation depends on your FetchpairData function
    // This should return the pair data from your data source
    return await FetchpairData(spotPairId);
  }

  calculateMakerStatus(reqBody, spotPairData) {
    let makerStatus = false;
    let avgPrice = reqBody.price;
    
    if (reqBody.buyorsell == "buy" && reqBody.price >= spotPairData.markPrice && spotPairData.botstatus == "off") {
      avgPrice = spotPairData.markPrice;
      makerStatus = true;
    }
    if (reqBody.buyorsell == "sell" && reqBody.price <= spotPairData.markPrice && spotPairData.botstatus == "off") {
      avgPrice = spotPairData.markPrice;
      makerStatus = true;
    }
    
    return { makerStatus, avgPrice };
  }

  validateQuantity(quantity, spotPairData) {
    if (quantity < parseFloat(spotPairData.minQuantity)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Quantity of contract must not be lesser than ${spotPairData.minQuantity}`,
        }
      };
    } else if (quantity > parseFloat(spotPairData.maxQuantity)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Quantity of contract must not be higher than ${spotPairData.maxQuantity}`,
        }
      };
    }
    return { isValid: true };
  }

  validatePrice(price, spotPairData) {
    let minPrice = spotPairData.markPrice - spotPairData.markPrice * (spotPairData.minPricePercentage / 100);
    let maxPrice = spotPairData.markPrice + spotPairData.markPrice * (spotPairData.maxPricePercentage / 100);
    
    if (price < minPrice) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Price of contract must not be lesser than ${minPrice}`,
        }
      };
    } else if (price > maxPrice) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Price of contract must not be higher than ${maxPrice}`,
        }
      };
    }
    return { isValid: true };
  }

  async validateBinanceRequirements(reqBody, spotPairData) {
    let getPriceConversion = await this.priceConversionGrpc({
      baseSymbol: spotPairData.firstCurrencySymbol,
      convertSymbol: spotPairData.secondCurrencySymbol,
    });
    
    if (getPriceConversion && getPriceConversion.status) {
      let total = this.truncateDecimals(getPriceConversion.convertPrice, 8);
      let checkDollar = total * reqBody.quantity;

      if (spotPairData.firstCurrencySymbol == "BNB" && parseFloat(checkDollar) < 5) {
        return {
          isValid: false,
          response: {
            status: false,
            message: `Total order value should be more than 5 USDT`,
          }
        };
      }

      if (parseFloat(checkDollar) < 10 && spotPairData.firstCurrencySymbol != "BNB") {
        return {
          isValid: false,
          response: {
            status: false,
            message: `Total order value should be more than 10 USDT`,
          }
        };
      }
    }
    return { isValid: true };
  }

  getCurrencyId(buyorsell, spotPairData) {
    return buyorsell == "buy" ? spotPairData.secondCurrencyId : spotPairData.firstCurrencyId;
  }

  async getUserWallet(userId, currencyId) {
    return await hget("walletbalance_spot", userId + "_" + currencyId);
  }

  async updateUserWallet(userId) {
    // Implementation depends on your updateUserWallet function
    return await updateUserWallet(userId);
  }

  calculateOrderValue(reqBody, buyorsell) {
    return buyorsell == "buy" ? reqBody.price * reqBody.quantity : reqBody.quantity;
  }

  async getSequenceId(collection) {
    // Implementation depends on your getSequenceId function
    return await getSequenceId(collection);
  }

  createOrderObject(reqBody, spotPairData, user, seqId, makerStatus, avgPrice) {
    return {
      _id: this.createObjectId(),
      userId: user.userId,
      pairId: spotPairData._id,
      firstCurrencyId: spotPairData.firstCurrencyId,
      firstCurrency: spotPairData.firstCurrencySymbol,
      firstFloatDigit: spotPairData.firstFloatDigit,
      secondCurrencyId: spotPairData.secondCurrencyId,
      secondCurrency: spotPairData.secondCurrencySymbol,
      secondFloatDigit: spotPairData.secondFloatDigit,
      makerFee: spotPairData.maker_rebate,
      takerFee: spotPairData.taker_fees,
      quantity: reqBody.quantity,
      price: reqBody.price,
      orderValue: reqBody.price * reqBody.quantity,
      pairName: `${spotPairData.firstCurrencySymbol}${spotPairData.secondCurrencySymbol}`,
      beforeBalance: 0, // Will be set later
      afterBalance: 0, // Will be set later
      orderType: reqBody.orderType,
      buyorsell: reqBody.buyorsell,
      openQuantity: reqBody.quantity,
      averagePrice: spotPairData.botstatus == "bot" ? 0 : avgPrice,
      filledQuantity: 0,
      isLiquidity: false,
      isLiquidityError: false,
      liquidityType: "off",
      flag: false,
      status: "open",
      orderDate: new Date(),
      userCode: user.userCode,
      isMaker: makerStatus ? true : false,
      orderCode: seqId,
    };
  }

  async updateWalletBalance(userId, currencyId, amount) {
    return await hincbyfloat("walletbalance_spot", userId + "_" + currencyId, amount);
  }

  async updateInOrderBalance(userId, currencyId, amount) {
    return await hincbyfloat("walletbalance_spot_inOrder", userId + "_" + currencyId, amount);
  }

  async handleInsufficientBalance(c, userbalance, orderValue, currencyId, spotPairData, newOpenOrder) {
    const user = c.get("user");
    const reqBody = await c.req.json();
    
    let retriveBal = (orderValue * 10 ** spotPairData.firstFloatDigit - Math.abs(userbalance) * 10 ** spotPairData.firstFloatDigit) / 10 ** spotPairData.firstFloatDigit;
    retriveBal += Math.abs(userbalance);
    
    let checkUp = await this.updateWalletBalance(user.userId, currencyId, retriveBal);
    await this.updateInOrderBalance(user.userId, currencyId, -retriveBal);
    
    let pDec = reqBody.buyorsell == "buy" ? spotPairData.firstFloatDigit : spotPairData.secondFloatDigit;
    
    this.createPassbookEntry(user, spotPairData, this.createObjectId(), parseFloat(retriveBal) - Math.abs(userbalance), userbalance, toFixedDown(orderValue, pDec), "spot_limit_orderPlace_Insufficient", "credit");
    this.createPassbookEntry(user, spotPairData, this.createObjectId(), parseFloat(userbalance), checkUp, toFixedDown(parseFloat(checkUp) + Math.abs(userbalance), pDec), "spot_limit_balretrive_Insufficient_Limit", "credit");
    
    return c.json({
      status: false,
      message: "Due to insufficient balance order cannot be placed",
    }, 400);
  }

  async processLimitOrder(newOpenOrder, reqBody, spotPairData, makerStatus, userbalance, orderValue) {
    let balance = parseFloat(userbalance) + orderValue;
    let afterBalance = parseFloat(userbalance);

    this.emitTradeAssetUpdate(newOpenOrder.secondCurrencyId, afterBalance, newOpenOrder.userId);
    
    if (makerStatus) {
      await this.liqOrdCreation(newOpenOrder, reqBody.buyorsell == "buy" ? "sell" : "buy", true);
    }
    
    newOpenOrder.orderDate = new Date();
    newOpenOrder.beforeBalance = balance;
    newOpenOrder.afterBalance = afterBalance;
    
    await this.newOrderHistory(newOpenOrder);
    await this.storeOrder(newOpenOrder);
    
    if (spotPairData.botstatus == "bot") {
      this.updateOrderBook(newOpenOrder, newOpenOrder.pairId, spotPairData.firstFloatDigit);
    }
    
    this.getOpenOrderSocket(newOpenOrder.userId, newOpenOrder.pairId);
    this.getOrderHistorySocket(newOpenOrder.userId, newOpenOrder.pairId);
  }

  createPassbookEntry(user, spotPairData, tableId, beforeBalance, afterBalance, amount, type, category) {
    passbook({
      userId: user.userId.toString(),
      coin: user.buyorsell == "buy" ? spotPairData.secondCurrencySymbol : spotPairData.firstCurrencySymbol,
      currencyId: user.buyorsell == "buy" ? spotPairData.secondCurrencyId : spotPairData.firstCurrencyId,
      tableId: tableId,
      beforeBalance: beforeBalance,
      afterBalance: afterBalance,
      amount: toFixedDown(amount, 8),
      type: type,
      category: category,
    });
  }

  // Market order helper methods
  validateOrderValue(reqBody, spotPairData) {
    if (parseFloat(reqBody.orderValue) < parseFloat(spotPairData.minOrderValue)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Order Value of contract must not be lesser than ${spotPairData.minOrderValue}`,
        }
      };
    } else if (parseFloat(reqBody.orderValue) > parseFloat(spotPairData.maxOrderValue)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Order Value of contract must not be higher than ${spotPairData.maxOrderValue}`,
        }
      };
    }
    return { isValid: true };
  }

  async validateBinanceMarketRequirements(reqBody, spotPairData) {
    let getPriceConversion = await this.priceConversionGrpc({
      baseSymbol: spotPairData.firstCurrencySymbol,
      convertSymbol: spotPairData.secondCurrencySymbol,
    });
    
    if (getPriceConversion && getPriceConversion.status) {
      let total = this.truncateDecimals(getPriceConversion.convertPrice, 8);
      let checkDollar = total * reqBody.orderValue;
      
      if (checkDollar < 10) {
        return {
          isValid: false,
          response: {
            status: false,
            message: `Total order value should be more than 10 USDT`,
          }
        };
      }
    }
    return { isValid: true };
  }

  validateSellQuantity(reqBody, spotPairData) {
    if (parseFloat(reqBody.amount) < parseFloat(spotPairData.minQuantity)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Quantity of contract must not be lesser than ${spotPairData.minQuantity}`,
        }
      };
    } else if (parseFloat(reqBody.amount) > parseFloat(spotPairData.maxQuantity)) {
      return {
        isValid: false,
        response: {
          status: false,
          message: `Quantity of contract must not be higher than ${spotPairData.maxQuantity}`,
        }
      };
    }
    return { isValid: true };
  }

  async validateOrderBook(c, side, spotPairData) {
    let getOrders = await hgetall(`${side}OpenOrders_` + spotPairData._id);
    if (side == "buy" && c.req.body?.buyorsell == "sell" && getOrders) {
      let GetOrders = getOrders;
      if (GetOrders) {
        GetOrders = await this.getvalueObj(GetOrders);
      }
      GetOrders = GetOrders.sort(function (a, b) {
        if (a.price === "market") return -1;
        else return b.price - a.price;
      });
    }
    return { isValid: true };
  }

  async validateBotOrderBook(c, side, spotPairData) {
    const user = c.get("user");
    let getOrders = await hgetall(`${side}OpenOrders_` + spotPairData._id);
    if (getOrders) {
      getOrders = await this.getvalueObj(getOrders);
      let checkLimit = (element) => element.price !== "market";
      let checkIndex = getOrders.findIndex(checkLimit);
      let findIndex = 0;
      let checkOrder = getOrders[checkIndex];
      
      if (checkOrder.userId == user.userId) {
        let findOrder = (element) => element.price !== "market" && element.userId != checkOrder.userId;
        findIndex = getOrders.findIndex(findOrder);
      }
      
      if (checkIndex == -1 || findIndex == -1) {
        return {
          isValid: false,
          response: { status: false, message: "No orders in order book" }
        };
      }
    } else {
      return {
        isValid: false,
        response: { status: false, message: "No orders in order book" }
      };
    }
    return { isValid: true };
  }

  calculateMarketOrderValue(reqBody, buyorsell) {
    return buyorsell == "buy" ? reqBody.orderValue : reqBody.amount;
  }

  createMarketOrderObject(reqBody, spotPairData, user, seqId, cost, orderValue, balance, userbalance) {
    return {
      _id: this.createObjectId(),
      userId: user.userId,
      pairId: spotPairData._id,
      firstCurrencyId: spotPairData.firstCurrencyId,
      firstCurrency: spotPairData.firstCurrencySymbol,
      firstFloatDigit: spotPairData.firstFloatDigit,
      secondCurrencyId: spotPairData.secondCurrencyId,
      secondCurrency: spotPairData.secondCurrencySymbol,
      secondFloatDigit: spotPairData.secondFloatDigit,
      makerFee: spotPairData.maker_rebate,
      takerFee: spotPairData.taker_fees,
      price: "market",
      [cost]: reqBody.buyorsell == "buy" ? orderValue : reqBody.amount,
      quantity: reqBody.quantity,
      filledQuantity: 0,
      pairName: `${spotPairData.firstCurrencySymbol}${spotPairData.secondCurrencySymbol}`,
      beforeBalance: balance,
      afterBalance: userbalance,
      orderType: reqBody.orderType,
      buyorsell: reqBody.buyorsell,
      openQuantity: reqBody.amount,
      openOrderValue: orderValue,
      averagePrice: 0,
      filledQuantity: 0,
      isLiquidity: false,
      isLiquidityError: false,
      liquidityType: "off",
      flag: true,
      status: "open",
      orderDate: new Date(),
      userCode: user.userCode,
      orderCode: seqId,
    };
  }

  async handleMarketInsufficientBalance(c, userbalance, orderValue, currencyId, spotPairData, newOpenOrder) {
    const user = c.get("user");
    
    let retriveBal = (orderValue * 10 ** spotPairData.firstFloatDigit - Math.abs(userbalance) * 10 ** spotPairData.firstFloatDigit) / 10 ** spotPairData.firstFloatDigit;
    retriveBal += Math.abs(userbalance);
    
    let checkUp = await this.updateWalletBalance(user.userId, currencyId, retriveBal);
    
    this.createPassbookEntry(user, spotPairData, this.createObjectId(), parseFloat(retriveBal) - Math.abs(userbalance), userbalance, toFixedDown(orderValue, 8), "spot_market_orderPlace_Insufficient", "credit");
    this.createPassbookEntry(user, spotPairData, this.createObjectId(), parseFloat(userbalance), checkUp, toFixedDown(parseFloat(checkUp) + Math.abs(userbalance), 8), "spot_limit_balretrive_Insufficient_Market", "credit");
    
    await hdel(newOpenOrder.buyorsell + "OpenOrders_" + newOpenOrder.pairId, newOpenOrder._id);
    
    return c.json({
      status: false,
      message: "Due to insufficient balance order cannot be placed",
    }, 400);
  }

  async storeOrder(newOpenOrder) {
    await hset(newOpenOrder.buyorsell + "OpenOrders_" + newOpenOrder.pairId, newOpenOrder._id, newOpenOrder);
  }

  async handleBinanceLiquidity(newOpenOrder, spotPairData, c, balance, userbalance, orderValue) {
    const user = c.get("user");
    let { status, message } = await this.liquidityOrderPlace(newOpenOrder, spotPairData);
    if (!status) {
      let userReturnbal = await this.updateWalletBalance(user.userId, newOpenOrder.secondCurrencyId, orderValue);
      
      this.createPassbookEntry(user, spotPairData, newOpenOrder._id, balance, userbalance, orderValue, "spot_market_orderPlace", "debit");
      this.createPassbookEntry(user, spotPairData, newOpenOrder._id, parseFloat(userReturnbal) - orderValue, parseFloat(userReturnbal), toFixed(parseFloat(orderValue), 8), "spot_market_orderPlace_market_return", "credit");
      
      return { status, message };
    }
    return { status: true };
  }

  emitTradeAssetUpdate(currencyId, spotBal, userId) {
    socketEmitOne("updateTradeAsset", { currencyId: currencyId, spotBal: spotBal }, userId);
  }

  async handleAdminLiquidity(newOpenOrder, reqBody, spotPairData) {
    let nOrd = newOpenOrder;
    nOrd.price = spotPairData.markPrice;
    nOrd.quantity = nOrd.buyorsell == "buy" ? reqBody.orderValue / spotPairData.markPrice : reqBody.amount;
    await this.liqOrdCreation(nOrd, reqBody.buyorsell == "buy" ? "sell" : "buy", false);
  }

  // Utility methods (these should be implemented based on your existing functions)
  createObjectId() {
    return createobjectId();
  }

  async priceConversionGrpc(params) {
    return await priceConversionGrpc(params);
  }

  truncateDecimals(value, decimals) {
    return truncateDecimals(value, decimals);
  }

  async liqOrdCreation(order, side, isMaker) {
    return await liqOrdCreation(order, side, isMaker);
  }

  async newOrderHistory(order) {
    return await newOrderHistory(order);
  }

  updateOrderBook(order, pairId, floatDigit) {
    return updateOrderBook(order, pairId, floatDigit);
  }

  getOpenOrderSocket(userId, pairId) {
    return getOpenOrderSocket(userId, pairId);
  }

  getOrderHistorySocket(userId, pairId) {
    return getOrderHistorySocket(userId, pairId);
  }

  async liquidityOrderPlace(order, pairData) {
    return await liquidityOrderPlace(order, pairData);
  }

  async getvalueObj(data) {
    return await getvalueObj(data);
  }

  passbook(data) {
    return passbook(data);
  }
}