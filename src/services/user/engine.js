import { hgetAll } from '../../config/redis.js'
import { PairModel } from '../../models/schema/index.js'
import { getRepository } from '../../models/repositoryFactory.js'
import { cancelMarketOrder } from './spot.js'

const pairRepo = getRepository(PairModel)

export const runEngine = async () => {
    let pairData;
    const sPairs = await hgetAll('sPairs')
    if (sPairs) {
        pairData = sPairs;
    } else {
        pairData = await pairRepo.find({ status: 'active' });
    }
    for (let elem of pairData) {
        if (elem.status == 'active') matchingcall()
    }
}

export const matchingcall = async (pairData) => {
    if (!isEmpty(pairData)) {
        let bList = await hgetAll("bOrders_" + pairData._id);
        if (bList) {
            bList = bList.sort((a, b) => a.orderDate - b.orderDate);
        }
        let sList = await hgetAll("sOrders_" + pairData._id);
        if (sList) {
            sList = sList.sort((a, b) => a.orderDate - b.orderDate);
        }
        await tradeMatching(bList, sList, pairData);
    }
};

export const tradeMatching = async (buyOrders, sellOrders, pairData) => {
    try {
        if (buyOrders == null && sellOrders != null) {
            sellOrders.forEach(async (element) => {
                if (element.price === "market" && element.liquidityType == "off") {
                    cancelMarketOrder(`sOrders_${element.pairId}`, element._id);
                    // return;
                }
                // else {
                //   if (element.liquidityType == "binance" && !element.isLiquidity) {
                //     await LiquidityOrderPlace(element, pairData);
                //   } else if (
                //     element.liquidityType == "wazirx" &&
                //     !element.isLiquidity
                //   ) {
                //     await wazirxLiquidityOrderPlace(element, pairData);
                //   }
                // }
            });
        }
        if (sellOrders == null && buyOrders != null) {
            buyOrders.forEach(async (element) => {
                if (element.price === "market" && element.liquidityType == "off") {
                    cancelMarketOrder(`bOrders_${element.pairId}`, element._id);
                    // return;
                }
                // else {
                //   if (element.liquidityType == "binance" && !element.isLiquidity) {
                //     await LiquidityOrderPlace(element, pairData);
                //   } else if (
                //     element.liquidityType == "wazirx" &&
                //     !element.isLiquidity
                //   ) {
                //     await wazirxLiquidityOrderPlace(element, pairData);
                //   }
                // }
            });
        }

        if (buyOrders == null || sellOrders == null) {
            // isRun = false;
            return;
        }

        buyOrders = buyOrders.sort(function (a, b) {
            if (a.price === "market") return -1;
            else return b.price - a.price;
        });
        sellOrders = sellOrders.sort(function (a, b) {
            if (a.price === "market") return -1;
            else return a.price - b.price;
        });
        if (buyOrders.length > 0 && sellOrders.length > 0) {
            isRun = true;
            tradePair = pairData._id;
        }
        while (buyOrders.length > 0 && sellOrders.length > 0) {
            let uniqueId = Math.floor(Math.random() * 1000000000);
            let current_buy = buyOrders[0];
            let current_buy_limit;
            let current_sell = sellOrders[0];
            let current_sell_limit;

            if (current_sell.isLiquidity && current_sell.liquidityType != "off") {
                sellOrders.shift();
                continue;
            }
            if (current_buy.isLiquidity && current_buy.liquidityType != "off") {
                buyOrders.shift();
                continue;
            }
            let checkLimit = (element) => element.price !== "market";
            let buyIndex = buyOrders.findIndex(checkLimit);
            let sellIndex = sellOrders.findIndex(checkLimit);
            current_buy_limit = buyOrders[buyIndex];
            current_sell_limit = sellOrders[sellIndex];

            if (current_buy.price == "market" && current_sell.price == "market" && current_buy.liquidityType == "off" && current_sell.liquidityType == "off") {
                if (current_buy_limit == -1 || current_sell_limit == -1) {
                    cancelMarketOrder(
                        `bOrders_${current_buy.pairId}`,
                        current_buy._id
                    );

                    cancelMarketOrder(
                        `sOrders_${current_sell.pairId}`,
                        current_sell._id
                    );

                    continue;
                }
                if (
                    current_buy.userId.toString() == current_sell_limit.userId.toString()
                ) {
                    buyOrders.shift();
                    sellOrders.splice(sellIndex, 1);
                    continue;
                } else if (
                    current_sell.userId.toString() == current_buy_limit.userId.toString()
                ) {
                    buyOrders.splice(buyIndex, 1);
                    sellOrders.shift();
                    continue;
                }
                let exectamount = current_buy.orderValue / current_sell_limit.price;
                if (current_sell_limit) {
                    current_buy.price = current_sell_limit.price;
                    current_buy.quantity = toFixedDown(
                        exectamount,
                        pairData.firstFloatDigit
                    );
                    await marketMatching(
                        buyOrders,
                        sellOrders,
                        current_buy,
                        current_sell_limit,
                        pairData
                    );
                }
                if (current_buy_limit) {
                    current_sell.price = current_buy_limit.price;
                    current_sell.quantity = current_sell.amount;
                    await marketMatching(
                        buyOrders,
                        sellOrders,
                        current_buy_limit,
                        current_sell,
                        pairData
                    );
                }
            } else if (
                current_buy.price == "market" &&
                current_sell.price != "market" &&
                current_buy.liquidityType == "off" &&
                current_sell.liquidityType == "off"
            ) {
                if (current_sell_limit == -1) {
                    cancelMarketOrder(
                        `bOrders_${current_buy.pairId}`,
                        current_buy._id
                    );

                    continue;
                }
                if (current_buy.userId.toString() == current_sell.userId.toString()) {
                    let checkLimit = (element) => (element.price !== "market" && element.userId != current_buy.userId);
                    let sellIndex = sellOrders.findIndex(checkLimit);
                    if (sellIndex >= 0) {
                        sellOrders.shift()
                    } else {
                        cancelMarketOrder(
                            `bOrders_${current_sell.pairId}`,
                            current_buy._id
                        );

                        buyOrders.shift();
                        sellOrders.splice(sellIndex, 1);
                    }

                    continue;
                }

                let exectamount = current_buy.orderValue / current_sell_limit.price;
                current_buy.price = current_sell_limit.price;
                current_buy.quantity = toFixedDown(
                    exectamount,
                    pairData.firstFloatDigit
                );
                await marketMatching(
                    buyOrders,
                    sellOrders,
                    current_buy,
                    current_sell_limit,
                    pairData
                );
            } else if (
                current_buy.price != "market" &&
                current_sell.price == "market" &&
                current_buy.liquidityType == "off" &&
                current_sell.liquidityType == "off"
            ) {
                if (current_buy_limit == -1) {
                    cancelMarketOrder(
                        `sOrders_${current_sell.pairId}`,
                        current_sell._id
                    );
                    continue;
                }

                if (current_buy.userId.toString() == current_sell.userId.toString()) {
                    let checkLimit = (element) => (element.price !== "market" && element.userId != current_buy.userId);
                    let buyIndex = buyOrders.findIndex(checkLimit);
                    if (buyIndex >= 0) {
                        buyOrders.shift()
                    } else {
                        cancelMarketOrder(
                            `sOrders_${current_sell.pairId}`,
                            current_sell._id
                        );

                        buyOrders.splice(buyIndex, 1);
                        sellOrders.shift();
                    }

                    continue;
                }

                current_sell.price = current_buy_limit.price;
                current_sell.quantity = parseFloat(current_sell.amount);
                await marketMatching(
                    buyOrders,
                    sellOrders,
                    current_buy_limit,
                    current_sell,
                    pairData
                );
            }

            ////LIMIT ORDER EXECUT

            if (current_buy.flag == false && current_sell.flag == false && current_buy.liquidityType == "off" && current_sell.liquidityType == "off") {
                if (current_buy.price >= current_sell.price) {
                    let isMaker =
                        current_buy.orderDate < current_sell.orderDate ? "buy" : "sell";
                    if (current_buy.userId.toString() == current_sell.userId.toString()) {
                        if (buyOrders.length > sellOrders.length) {
                            buyOrders.shift();
                        } else {
                            sellOrders.shift();
                        }
                        continue
                    }
                    let exectamount = Math.min(
                        current_buy.quantity,
                        current_sell.quantity
                    );
                    let execvalue =
                        isMaker == "buy"
                            ? exectamount * current_buy.price
                            : exectamount * current_sell.price;
                    let sellFee =
                        isMaker == "sell"
                            ? (execvalue * current_buy.makerFee) / 100
                            : (execvalue * current_buy.takerFee) / 100;
                    let buyFee =
                        isMaker == "buy"
                            ? (exectamount * current_sell.makerFee) / 100
                            : (exectamount * current_sell.takerFee) / 100;
                    let avgPrice =
                        isMaker == "buy" ? current_buy.price : current_sell.price;
                    let buyerWallet = await hgetField(
                        "walletbalance_spot",
                        current_buy.userId + "_" + current_buy.firstCurrencyId
                    );
                    let sellerWallet = await hgetField(
                        "walletbalance_spot",
                        current_sell.userId + "_" + current_sell.secondCurrencyId
                    );

                    let buyExcAmount =
                        (current_buy.quantity * 10 ** current_buy.firstFloatDigit -
                            exectamount * 10 ** current_buy.firstFloatDigit) /
                        10 ** current_buy.firstFloatDigit;
                    let sellExcAmount =
                        (current_sell.quantity * 10 ** current_sell.firstFloatDigit -
                            exectamount * 10 ** current_sell.firstFloatDigit) /
                        10 ** current_sell.firstFloatDigit;
                    let sellInOrder
                    let buyInOrder

                    sellerWallet = parseFloat(sellerWallet);
                    buyerWallet = parseFloat(buyerWallet);
                    current_buy.quantity = (buyExcAmount * 100) / 100;
                    current_buy.filledQuantity += exectamount;
                    current_sell.quantity = (sellExcAmount * 100) / 100;
                    current_sell.filledQuantity += exectamount;
                    current_buy.averagePrice += avgPrice * exectamount;
                    current_sell.averagePrice += avgPrice * exectamount;
                    current_sell.tradePrice = avgPrice;
                    current_sell.tradeQty = exectamount;
                    current_sell.createdAt = Date.now();
                    current_buy.tradePrice = avgPrice;
                    current_buy.tradeQty = exectamount;
                    current_buy.createdAt = Date.now();
                    current_buy.fee = buyFee;
                    current_sell.fee = sellFee;
                    //order update process
                    if (current_buy.quantity == 0) {
                        if (
                            isMaker == "sell" &&
                            current_buy.orderValue > current_buy.averagePrice
                        ) {
                            let retriveBal = parseFloat(current_buy.orderValue) - parseFloat(current_buy.averagePrice);
                            let buyRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_buy.userId + "_" + current_buy.secondCurrencyId,
                                retriveBal
                            );
                            let beforeBAL = parseFloat(buyRetrive) - parseFloat(retriveBal);
                            // passbook({
                            //     userId: current_buy.userId,
                            //     coin: current_buy.secondCurrency,
                            //     currencyId: current_buy.secondCurrencyId,
                            //     tableId: current_buy._id,
                            //     beforeBalance: toFixedDown(beforeBAL, 8),
                            //     afterBalance: toFixedDown(buyRetrive, 8),
                            //     amount: parseFloat(retriveBal),
                            //     type: "spot_limit_bal_retrieve",
                            //     category: "credit",
                            // });
                            // // Pass Book
                            // socketEmitOne(
                            //     "updateTradeAsset",
                            //     {
                            //         currencyId: current_buy.secondCurrencyId,
                            //         spotBal: buyRetrive,
                            //         inOrder: buyInOrder
                            //     },
                            //     current_buy.userId
                            // );
                        }
                        current_buy.status = "completed";
                        let inOrderVal = current_buy.price * current_buy.filledQuantity
                        buyInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                        hsetField(
                            "orderHist_" + current_buy.userId,
                            current_buy._id,
                            current_buy
                        );
                        await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                        orderHistArr.push(current_buy);
                        buyOrders.shift();
                    } else {
                        current_buy.status = "pending";
                        let inOrderVal = current_buy.price * current_buy.filledQuantity
                        buyInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                        orderHistArr.push(current_buy);
                        await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                        await hsetField(
                            "bOrders_" + current_buy.pairId,
                            current_buy._id,
                            current_buy
                        );
                        // }
                    }

                    if (current_sell.quantity == 0) {
                        current_sell.status = "completed";
                        current_sell.triggerPrice = current_buy.price;
                        sellInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                        hsetField(
                            "orderHist_" + current_sell.userId,
                            current_sell._id,
                            current_sell
                        );
                        await hdelField(
                            "sOrders_" + current_sell.pairId,
                            current_sell._id
                        );
                        orderHistArr.push(current_sell);
                        sellOrders.shift();
                    } else {
                        current_sell.status = "pending";

                        sellInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                        current_sell.triggerPrice = current_buy.price;
                        orderHistArr.push(current_sell);
                        await hdelField(
                            "sOrders_" + current_sell.pairId,
                            current_sell._id
                        );
                        await hsetField(
                            "sOrders_" + current_sell.pairId,
                            current_sell._id,
                            current_sell
                        );
                    }
                    // }
                    //update for BUY
                    updateBook({
                        buyorsell: current_buy.buyorsell,
                        price: current_buy.price,
                        minusQuantity: exectamount,
                        pairId: current_buy.pairId,
                        firstFloatDigit: current_buy.firstFloatDigit,
                    });

                    //update for SELL
                    updateBook({
                        buyorsell: current_sell.buyorsell,
                        price: current_sell.price,
                        minusQuantity: exectamount,
                        pairId: current_sell.pairId,
                        firstFloatDigit: current_sell.firstFloatDigit,
                    });

                    // passbook({
                    //     userId: current_buy.userId,
                    //     coin: current_buy.firstCurrency,
                    //     currencyId: current_buy.firstCurrencyId,
                    //     tableId: current_buy._id,
                    //     beforeBalance: toFixedDown(buyerWallet, 8),
                    //     afterBalance: toFixedDown((buyerWallet + (exectamount - buyFee)), 8),
                    //     amount: toFixedDown((exectamount - buyFee), 8),
                    //     type: "spot_limit_match",
                    //     category: "credit",
                    // });
                    // passbook({
                    //     userId: current_sell.userId,
                    //     coin: current_sell.secondCurrency,
                    //     currencyId: current_sell.secondCurrencyId,
                    //     tableId: current_sell._id,
                    //     beforeBalance: toFixedDown(sellerWallet, 8),
                    //     afterBalance: toFixedDown((sellerWallet + (execvalue - sellFee)), 8),
                    //     amount: parseFloat(execvalue - sellFee),
                    //     type: "spot_limit_match",
                    //     category: "credit",
                    // });
                    tradeHistArr.push({
                        buyOrderData: current_buy,
                        sellOrderData: current_sell,
                        uniqueId: uniqueId,
                        execPrice: avgPrice,
                        Maker: isMaker,
                        buyerFee: buyFee,
                        sellerFee: sellFee,
                        execQuantity: exectamount,
                        ordertype: "Limit",
                    });

                    execvalue -= sellFee;
                    exectamount -= buyFee;
                    let buyerFinaleBalance = await hincbyfloat(
                        "walletbalance_spot",
                        current_buy.userId + "_" + current_buy.firstCurrencyId,
                        exectamount
                    );
                    let sellerFinaleBalance = await hincbyfloat(
                        "walletbalance_spot",
                        current_sell.userId + "_" + current_sell.secondCurrencyId,
                        execvalue
                    );

                    // socketEmitOne(
                    //     "updateTradeAsset",
                    //     {
                    //         currencyId: current_buy.firstCurrencyId,
                    //         spotBal: buyerFinaleBalance,
                    //         inOrder: buyInOrder
                    //     },
                    //     current_buy.userId
                    // );
                    // socketEmitOne(
                    //     "updateTradeAsset",
                    //     {
                    //         currencyId: current_sell.secondCurrencyId,
                    //         spotBal: sellerFinaleBalance,
                    //         inOrder: sellInOrder
                    //     },
                    //     current_sell.userId
                    // );
                    tradePair = "";
                    // getOpenOrderSocket(current_sell.userId, current_sell.pairId);
                    // getOpenOrderSocket(current_buy.userId, current_buy.pairId);
                    // getOrderHistorySocket(current_buy.userId, current_buy.pairId);
                    // getOrderHistorySocket(current_sell.userId, current_sell.pairId);
                }
                break;
            }
        }
        isRun = false

        //DB MAINTAIN
        if (orderHistArr.length > 0) {
            orderHistArr.forEach((element) => {
                newOrderHistory(element);
            });
            orderHistArr = [];
        }

        if (tradeHistArr.length > 0) {
            tradeHistArr.forEach((element) => {
                newTradeHistory(element);
            });
            tradeHistArr = [];
        }

        if (buyOrders.length <= 0) {
            sellOrders.forEach(async (element) => {
                if (
                    element.price === "market" &&
                    element.liquidityType == "off" &&
                    !element.isLiquidity
                ) {
                    cancelMarketOrder(`sOrders_${element.pairId}`, element._id);
                    return;
                }
                // if (element.liquidityType == "binance" && !element.isLiquidity) {
                //   await LiquidityOrderPlace(element, pairData);
                // } else if (element.liquidityType == "wazirx" && !element.isLiquidity) {
                //   await wazirxLiquidityOrderPlace(element, pairData);
                // }
            });
        }
        if (sellOrders.length <= 0) {
            buyOrders.forEach(async (element) => {
                if (
                    element.price === "market" &&
                    element.liquidityType == "off" &&
                    !element.isLiquidity
                ) {
                    cancelMarketOrder(`bOrders_${element.pairId}`, element._id);
                    return;
                }
                // if (element.liquidityType == "binance" && !element.isLiquidity) {
                //   await LiquidityOrderPlace(element, pairData);
                // } else if (element.liquidityType == "wazirx" && !element.isLiquidity) {
                //   await wazirxLiquidityOrderPlace(element, pairData);
                // }
            });
        }
        if (tradePair == pairData._id) tradePair = "";
    } catch (err) {
        console.log("----------------------TRADE MATCH ERR", err);
    }
};

export const marketMatching = async (
    buyOrders,
    sellOrders,
    current_buy,
    current_sell,
    pairData
) => {
    try {
        if (current_buy.liquidityType == 'off' && current_sell.liquidityType == 'off') {
            let uniqueId = Math.floor(Math.random() * 1000000000);
            let isMaker =
                current_buy.orderDate < current_sell.orderDate ? "buy" : "sell";
            let sellamount = current_sell.quantity;
            let buyerWallet = await hget(
                "walletbalance_spot",
                current_buy.userId + "_" + current_buy.firstCurrencyId
            );
            buyerWallet = parseFloat(buyerWallet);
            let sellerWallet = await hget(
                "walletbalance_spot",
                current_sell.userId + "_" + current_sell.secondCurrencyId
            );
            sellerWallet = parseFloat(sellerWallet);
            let exectamount = Math.min(current_buy.quantity, current_sell.quantity);
            let execvalue =
                isMaker == "buy"
                    ? exectamount * current_buy.price
                    : exectamount * current_sell.price;
            let sellFee =
                isMaker == "sell"
                    ? execvalue * (current_buy.makerFee / 100)
                    : execvalue * (current_buy.takerFee / 100);
            let buyFee =
                isMaker == "buy"
                    ? exectamount * (current_sell.makerFee / 100)
                    : exectamount * (current_sell.takerFee / 100);
            let avgPrice = isMaker == "buy" ? current_buy.price : current_sell.price;
            let buyExcAmount =
                (current_buy.quantity * 10 ** current_buy.firstFloatDigit -
                    exectamount * 10 ** current_buy.firstFloatDigit) /
                10 ** current_buy.firstFloatDigit;
            current_buy.quantity = (buyExcAmount * 100) / 100;
            current_buy.filledQuantity += exectamount;
            let sellExcAmount =
                (current_sell.quantity * 10 ** current_sell.firstFloatDigit -
                    exectamount * 10 ** current_sell.firstFloatDigit) /
                10 ** current_sell.firstFloatDigit;
            current_sell.quantity = (sellExcAmount * 100) / 100;
            current_sell.filledQuantity += exectamount;
            current_buy.averagePrice += avgPrice * exectamount;
            current_sell.averagePrice += avgPrice * exectamount;

            //order update process
            if (current_buy.quantity == 0) {
                current_buy.status = "completed";
                if (!current_buy.flag) {
                    let inOrderVal = current_buy.price * current_buy.filledQuantity
                    await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                }

                let retriveBal = parseFloat(current_buy.openOrderValue) - parseFloat(current_buy.averagePrice);

                if (retriveBal > 0) {
                    if (current_buy.liquidityType == "off" && !current_buy.isLiquidity) {

                        let buyRetrive = await hincbyfloat(
                            "walletbalance_spot",
                            current_buy.userId + "_" + current_buy.secondCurrencyId,
                            retriveBal
                        );

                        let beforeBAL = parseFloat(buyRetrive) - parseFloat(retriveBal);
                        // passbook({
                        //     userId: current_buy.userId,
                        //     coin: current_buy.secondCurrency,
                        //     currencyId: current_buy.secondCurrencyId,
                        //     tableId: current_buy._id,
                        //     beforeBalance: toFixedDown(beforeBAL, 8),
                        //     afterBalance: toFixedDown(buyRetrive, 8),
                        //     amount: parseFloat(retriveBal),
                        //     type: "spot_market_bal_retrieve_buy",
                        //     category: "credit",
                        // });
                        // socketEmitOne(
                        //     "updateTradeAsset",
                        //     {
                        //         currencyId: current_buy.secondCurrencyId,
                        //         spotBal: buyRetrive,
                        //     },
                        //     current_buy.userId
                        // );
                    }
                }

                hsetField("orderHist_" + current_buy.userId, current_buy._id, current_buy);
                await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                newOrderHistory(current_buy);
                buyOrders.shift();
            } else {
                if (current_buy.flag == true) {
                    let checkLimit = (element) => element._id !== current_sell._id;
                    let checkOrder = sellOrders.findIndex(checkLimit);
                    let retriveBal = parseFloat(current_buy.openOrderValue) - parseFloat(current_buy.averagePrice);
                    current_buy.orderValue = retriveBal;
                    current_buy.quantity = 0;
                    if (retriveBal > 0 && checkOrder == -1) {
                        if (current_buy.liquidityType == "off" && !current_buy.isLiquidity) {
                            current_buy.status = "completed";
                            hsetField(
                                "orderHist_" + current_buy.userId,
                                current_buy._id,
                                current_buy
                            );
                            let buyRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_buy.userId + "_" + current_buy.secondCurrencyId,
                                retriveBal
                            );
                            await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                            let beforeBAL = parseFloat(buyRetrive) - parseFloat(retriveBal);
                            // passbook({
                            //     userId: current_buy.userId,
                            //     coin: current_buy.secondCurrency,
                            //     currencyId: current_buy.secondCurrencyId,
                            //     tableId: current_buy._id,
                            //     beforeBalance: toFixedDown(beforeBAL, 8),
                            //     afterBalance: toFixedDown(buyRetrive, 8),
                            //     amount: parseFloat(retriveBal),
                            //     type: "spot_market_bal_retrieve_buy",
                            //     category: "credit",
                            // });
                            // newOrderHistory(current_buy);
                            // socketEmitOne(
                            //     "updateTradeAsset",
                            //     {
                            //         currencyId: current_buy.secondCurrencyId,
                            //         spotBal: buyRetrive,
                            //     },
                            //     current_buy.userId
                            // );
                        }
                    } else {
                        current_buy.price = "market";
                        current_buy.status = "pending";
                        await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                        await hsetField(
                            "bOrders_" + current_buy.pairId,
                            current_buy._id,
                            current_buy,
                            "buyone"
                        );
                        newOrderHistory(current_buy);
                    }
                } else {
                    current_buy.status = "pending";
                    let inOrderVal = current_buy.price * current_buy.filledQuantity
                    await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                    await hdelField("bOrders_" + current_buy.pairId, current_buy._id);
                    await hsetField(
                        "bOrders_" + current_buy.pairId,
                        current_buy._id,
                        current_buy,
                        "buytwo"
                    );
                    newOrderHistory(current_buy);
                }
            }
            if (current_sell.quantity == 0) {
                current_sell.status = "completed";
                if (!current_sell.flag) {
                    await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                }
                hsetField(
                    "orderHist_" + current_sell.userId,
                    current_sell._id,
                    current_sell
                );
                await hdelField("sOrders_" + current_sell.pairId, current_sell._id);
                newOrderHistory(current_sell);
                sellOrders.shift();
            } else {
                if (current_sell.flag == true) {
                    let checkLimit = (element) => element._id !== current_sell._id;
                    let checkOrder = buyOrders.findIndex(checkLimit);
                    let retriveBal = sellamount - exectamount;
                    current_sell.price = "market";
                    current_sell.amount = current_sell.quantity;
                    if (retriveBal > 0 && checkOrder == -1) {
                        if (current_sell.liquidityType == "off") {
                            current_sell.status = "completed";
                            hsetField(
                                "orderHist_" + current_sell.userId,
                                current_sell._id,
                                current_sell
                            );
                            let sellRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_sell.userId + "_" + current_sell.firstCurrencyId,
                                retriveBal
                            );
                            await hdelField(
                                "sOrders_" + current_sell.pairId,
                                current_sell._id
                            );
                            let beforeBAL = parseFloat(sellRetrive) - parseFloat(retriveBal);
                            // passbook({
                            //     userId: current_sell.userId,
                            //     coin: current_sell.firstCurrency,
                            //     currencyId: current_sell.firstCurrencyId,
                            //     tableId: current_sell._id,
                            //     beforeBalance: toFixedDown(beforeBAL, 8),
                            //     afterBalance: toFixedDown(sellRetrive, 8),
                            //     amount: parseFloat(retriveBal),
                            //     type: "spot_market_bal_retrieve_sell",
                            //     category: "credit",
                            // });
                            // newOrderHistory(current_sell);
                            // socketEmitOne(
                            //     "updateTradeAsset",
                            //     {
                            //         currencyId: current_sell.firstCurrencyId,
                            //         spotBal: sellRetrive,
                            //     },
                            //     current_sell.userId
                            // );
                        }
                    } else {
                        current_buy.status = "pending";
                        await hdelField("sOrders_" + current_sell.pairId, current_sell._id);
                        await hsetField(
                            "sOrders_" + current_sell.pairId,
                            current_sell._id,
                            current_sell,
                            "sellone"
                        );
                        newOrderHistory(current_sell);
                    }
                } else {
                    current_sell.status = "pending";
                    await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                    await hdelField("sOrders_" + current_sell.pairId, current_sell._id);
                    await hsetField(
                        "sOrders_" + current_sell.pairId,
                        current_sell._id,
                        current_sell,
                        "selltwo"
                    );
                    newOrderHistory(current_sell);
                }
            }

            //Order Book update for BUY
            if (current_sell.flag == true) {
                updateBook({
                    buyorsell: current_buy.buyorsell,
                    price: current_buy.price,
                    minusQuantity: exectamount,
                    pairId: current_buy.pairId,
                    firstFloatDigit: pairData.firstFloatDigit,
                });
            }
            // passbook({
            //     userId: current_buy.userId,
            //     coin: current_buy.firstCurrency,
            //     currencyId: current_buy.firstCurrencyId,
            //     tableId: current_buy._id,
            //     beforeBalance: toFixedDown(buyerWallet, 8),
            //     afterBalance: toFixedDown((buyerWallet + (exectamount - buyFee)), 8),
            //     amount: parseFloat(exectamount - buyFee),
            //     type: "spot_market_match",
            //     category: "credit",
            // });
            //Order Book update for SELL
            if (current_buy.flag == true) {
                updateBook({
                    buyorsell: current_sell.buyorsell,
                    price: current_sell.price,
                    minusQuantity: exectamount,
                    pairId: current_sell.pairId,
                    firstFloatDigit: pairData.firstFloatDigit,
                });
            }
            // passbook({
            //     userId: current_sell.userId,
            //     coin: current_sell.secondCurrency,
            //     currencyId: current_sell.secondCurrencyId,
            //     tableId: current_sell._id,
            //     beforeBalance: toFixedDown(sellerWallet, 8),
            //     afterBalance: toFixedDown((sellerWallet + (execvalue - sellFee)), 8),
            //     amount: parseFloat(execvalue - sellFee),
            //     type: "spot_market_match",
            //     category: "credit",
            // });
            // Trade History
            // newTradeHistory({
            //     buyOrderData: current_buy,
            //     sellOrderData: current_sell,
            //     uniqueId: uniqueId,
            //     execPrice: avgPrice,
            //     Maker: isMaker,
            //     buyerFee: buyFee,
            //     sellerFee: sellFee,
            //     execQuantity: exectamount,
            //     ordertype: "Market",
            // });

            execvalue -= sellFee;
            exectamount -= buyFee;
            let buyWallet = await hincbyfloat(
                "walletbalance_spot",
                current_buy.userId + "_" + current_buy.firstCurrencyId,
                exectamount
            );
            let sellWallet = await hincbyfloat(
                "walletbalance_spot",
                current_sell.userId + "_" + current_sell.secondCurrencyId,
                execvalue
            );
            // getOpenOrderSocket(current_sell.userId, current_sell.pairId);
            // getOpenOrderSocket(current_buy.userId, current_buy.pairId);
            // getOrderHistorySocket(current_buy.userId, current_buy.pairId);
            // getOrderHistorySocket(current_sell.userId, current_sell.pairId);
            // socketEmitOne(
            //     "updateTradeAsset",
            //     {
            //         currencyId: current_buy.firstCurrencyId,
            //         spotBal: buyWallet,
            //     },
            //     current_buy.userId
            // );
            // socketEmitOne(
            //     "updateTradeAsset",
            //     {
            //         currencyId: current_sell.secondCurrencyId,
            //         spotBal: sellWallet,
            //     },
            //     current_sell.userId
            // );
        }

    } catch (err) {
        console.log(err, "-----------------Market match error");
    }
};