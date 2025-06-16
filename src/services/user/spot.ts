// Type definitions
import {OrderData,TradeHistoryData,PairData,PassbookData,OrderBookData,ChartData} from '../../interfaces/trade'
import { Pair } from '@/models/schema/index';
import { getRepository } from "@/models/repositoryFactory.js";
import { hgetField } from '@/config/redis';
import isEmpty from '@/utils/isEmpty'

declare let isRun: boolean;
declare let tradePair: string;
declare let orderHistArr: OrderData[];
declare let tradeHistArr: TradeHistoryData[];
//modules
const SpotPair = getRepository(Pair)


declare function isEmpty(value: any): boolean;
declare function hgetall(key: string): Promise<Record<string, any> | null>;
declare function getvalueObj(obj: Record<string, any>): Promise<OrderData[]>;
declare function hget(key: string, field?: string): Promise<string | null>;
declare function hset(key: string, field: string, value: any): Promise<void>;
declare function hdel(key: string, field: string): Promise<void>;
declare function hincbyfloat(key: string, field: string, increment: number): Promise<number>;
declare function toFixedDown(value: number, decimals: number): number;
declare function cancelMarketOrder(key: string, orderId: string): Promise<void>;
declare function passbook(data: PassbookData): void;
declare function socketEmitOne(event: string, data: any, userId: string): void;
declare function editOrderBook(data: OrderBookData): void;
declare function newOrderHistory(orderData: OrderData): void;
declare function newTradeHistory(tradeData: TradeHistoryData): void;
declare function ChartDocHistory(data: ChartData): void;
declare function getOpenOrderSocket(userId: string, pairId: string): void;
declare function getOrderHistorySocket(userId: string, pairId: string): void;

export const matchingcall = async (pairId: string): Promise<void> => {
    let pairData: PairData;
    let spotPairData = await hgetField('spotPair',pairId);
    if (spotPairData) {
        pairData = spotPairData;
    } else {
        pairData = await SpotPair.findOne({ _id: pairId });
    }
    if (!isEmpty(pairData)) {
        let orderList: OrderData[] | null = await hgetall("buyOpenOrders_" + pairData._id);
        if (orderList) {
            orderList = await getvalueObj(orderList);
            orderList = orderList.sort((a, b) => a.orderDate - b.orderDate);
        }
        let sellorderList: OrderData[] | null = await hgetall("sellOpenOrders_" + pairData._id);
        if (sellorderList) {
            sellorderList = await getvalueObj(sellorderList);
            sellorderList = sellorderList.sort((a, b) => a.orderDate - b.orderDate);
        }
        await tradeMatching(orderList, sellorderList, pairData);
    }
};

export const tradeMatching = async (
    buyOrders: OrderData[] | null, 
    sellOrders: OrderData[] | null, 
    pairData: PairData
): Promise<void> => {
    try {
        if (buyOrders == null && sellOrders != null) {
            sellOrders.forEach(async (element) => {
                if (element.price === "market" && element.liquidityType == "off") {
                    cancelMarketOrder(`sellOpenOrders_${element.pairId}`, element._id);
                }
            });
        }
        if (sellOrders == null && buyOrders != null) {
            buyOrders.forEach(async (element) => {
                if (element.price === "market" && element.liquidityType == "off") {
                    cancelMarketOrder(`buyOpenOrders_${element.pairId}`, element._id);
                }
            });
        }

        if (buyOrders == null || sellOrders == null) {
            return;
        }

        buyOrders = buyOrders.sort(function (a, b) {
            if (a.price === "market") return -1;
            else return (b.price as number) - (a.price as number);
        });
        sellOrders = sellOrders.sort(function (a, b) {
            if (a.price === "market") return -1;
            else return (a.price as number) - (b.price as number);
        });
        
        if (buyOrders.length > 0 && sellOrders.length > 0) {
            isRun = true;
            tradePair = pairData._id;
        }
        
        while (buyOrders.length > 0 && sellOrders.length > 0) {
            let uniqueId = Math.floor(Math.random() * 1000000000);
            let current_buy = buyOrders[0];
            let current_buy_limit: OrderData | undefined;
            let current_sell = sellOrders[0];
            let current_sell_limit: OrderData | undefined;

            if (current_sell.isLiquidity && current_sell.liquidityType != "off") {
                sellOrders.shift();
                continue;
            }
            if (current_buy.isLiquidity && current_buy.liquidityType != "off") {
                buyOrders.shift();
                continue;
            }
            
            let checkLimit = (element: OrderData) => element.price !== "market";
            let buyIndex = buyOrders.findIndex(checkLimit);
            let sellIndex = sellOrders.findIndex(checkLimit);
            current_buy_limit = buyOrders[buyIndex];
            current_sell_limit = sellOrders[sellIndex];

            //MARKET ORDER EXECUTE
            if (current_buy.price == "market" && current_sell.price == "market" && current_buy.liquidityType == "off" && current_sell.liquidityType == "off") {
                if (buyIndex === -1 || sellIndex === -1) {
                    cancelMarketOrder(
                        `buyOpenOrders_${current_buy.pairId}`,
                        current_buy._id
                    );
                    cancelMarketOrder(
                        `sellOpenOrders_${current_sell.pairId}`,
                        current_sell._id
                    );
                    continue;
                }
                if (
                    current_buy.userId.toString() == current_sell_limit!.userId.toString()
                ) {
                    buyOrders.shift();
                    sellOrders.splice(sellIndex, 1);
                    continue;
                } else if (
                    current_sell.userId.toString() == current_buy_limit!.userId.toString()
                ) {
                    buyOrders.splice(buyIndex, 1);
                    sellOrders.shift();
                    continue;
                }
                let exectamount = current_buy.orderValue / (current_sell_limit!.price as number);
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
                    current_sell.quantity = current_sell.amount || 0;
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
                if (sellIndex === -1) {
                    cancelMarketOrder(
                        `buyOpenOrders_${current_buy.pairId}`,
                        current_buy._id
                    );
                    continue;
                }

                if (current_buy.userId.toString() == current_sell.userId.toString()) {
                    let checkLimit = (element: OrderData) => (element.price !== "market" && element.userId != current_buy.userId);
                    let sellIndex = sellOrders.findIndex(checkLimit);
                    if (sellIndex >= 0) {
                        sellOrders.shift()
                    } else {
                        cancelMarketOrder(
                            `buyOpenOrders_${current_sell.pairId}`,
                            current_buy._id
                        );
                        buyOrders.shift();
                        sellOrders.splice(sellIndex, 1);
                    }
                    continue;
                }

                let exectamount = current_buy.orderValue / (current_sell_limit!.price as number);
                console.log(exectamount, '---exectamount')
                current_buy.price = current_sell_limit!.price;
                current_buy.quantity = toFixedDown(
                    exectamount,
                    pairData.firstFloatDigit
                );
                console.log(current_buy.quantity, '----current_buy.quantity')
                await marketMatching(
                    buyOrders,
                    sellOrders,
                    current_buy,
                    current_sell_limit!,
                    pairData
                );
            } else if (
                current_buy.price != "market" &&
                current_sell.price == "market" &&
                current_buy.liquidityType == "off" &&
                current_sell.liquidityType == "off"
            ) {
                if (buyIndex === -1) {
                    cancelMarketOrder(
                        `sellOpenOrders_${current_sell.pairId}`,
                        current_sell._id
                    );
                    continue;
                }

                if (current_buy.userId.toString() == current_sell.userId.toString()) {
                    let checkLimit = (element: OrderData) => (element.price !== "market" && element.userId != current_buy.userId);
                    let buyIndex = buyOrders.findIndex(checkLimit);
                    if (buyIndex >= 0) {
                        buyOrders.shift()
                    } else {
                        cancelMarketOrder(
                            `sellOpenOrders_${current_sell.pairId}`,
                            current_sell._id
                        );
                        buyOrders.splice(buyIndex, 1);
                        sellOrders.shift();
                    }
                    continue;
                }

                current_sell.price = current_buy_limit!.price;
                current_sell.quantity = parseFloat(current_sell.amount?.toString() || '0');
                await marketMatching(
                    buyOrders,
                    sellOrders,
                    current_buy_limit!,
                    current_sell,
                    pairData
                );
            }

            ////LIMIT ORDER EXECUTE
            if (current_buy.flag == false && current_sell.flag == false && current_buy.liquidityType == "off" && current_sell.liquidityType == "off") {
                if ((current_buy.price as number) >= (current_sell.price as number)) {
                    let isMaker: 'buy' | 'sell' =
                        current_buy.orderDate < current_sell.orderDate ? "buy" : "sell";
                    if (current_buy.userId.toString() == current_sell.userId.toString()) {
                        if (buyOrders.length > sellOrders.length) {
                            buyOrders.shift();
                        } else {
                            sellOrders.shift();
                        }
                        continue
                    }
                    let sellamount = current_sell.quantity;
                    let exectamount = Math.min(
                        current_buy.quantity,
                        current_sell.quantity
                    );
                    let execvalue =
                        isMaker == "buy"
                            ? exectamount * (current_buy.price as number)
                            : exectamount * (current_sell.price as number);
                    let sellFee =
                        isMaker == "sell"
                            ? (execvalue * current_buy.makerFee) / 100
                            : (execvalue * current_buy.takerFee) / 100;
                    let buyFee =
                        isMaker == "buy"
                            ? (exectamount * current_sell.makerFee) / 100
                            : (exectamount * current_sell.takerFee) / 100;
                    let avgPrice =
                        isMaker == "buy" ? (current_buy.price as number) : (current_sell.price as number);
                    let buyerWallet = await hget(
                        "walletbalance_spot",
                        current_buy.userId + "_" + current_buy.firstCurrencyId
                    );
                    let sellerWallet = await hget(
                        "walletbalance_spot",
                        current_sell.userId + "_" + current_sell.secondCurrencyId
                    );
                    
                    /* START IGNORE TRADE FEE */
                                let buyUsrDoc = await hget("userToken_" + current_buy.userId, current_buy.userId);
                    let sellUsrDoc = await hget("userToken_" + current_sell.userId, current_sell.userId);
                    
                    if (buyUsrDoc) {
                        let buyUsrDocParsed: UserDoc = JSON.parse(buyUsrDoc);
                        if (buyUsrDocParsed.feeManagement?.includes(current_buy.firstCurrencyId)) {
                            buyFee = 0;
                        }
                    }

                    if (sellUsrDoc) {
                        let sellUsrDocParsed: UserDoc = JSON.parse(sellUsrDoc);
                        if (sellUsrDocParsed.feeManagement?.includes(current_sell.secondCurrencyId)) {
                            sellFee = 0;
                        }
                    }
                    /* END IGNORE TRADE FEE */
                    
                    let buyExcAmount =
                        (current_buy.quantity * 10 ** current_buy.firstFloatDigit -
                            exectamount * 10 ** current_buy.firstFloatDigit) /
                        10 ** current_buy.firstFloatDigit;
                    let sellExcAmount =
                        (current_sell.quantity * 10 ** current_sell.firstFloatDigit -
                            exectamount * 10 ** current_sell.firstFloatDigit) /
                        10 ** current_sell.firstFloatDigit;
                    let sellInOrder: number;
                    let buyInOrder: number;

                    let sellerWalletNum = parseFloat(sellerWallet || '0');
                    let buyerWalletNum = parseFloat(buyerWallet || '0');
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
                            let retriveBal = parseFloat(current_buy.orderValue.toString()) - parseFloat(current_buy.averagePrice.toString());
                            let buyRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_buy.userId + "_" + current_buy.secondCurrencyId,
                                retriveBal
                            );
                            let beforeBAL = parseFloat(buyRetrive.toString()) - parseFloat(retriveBal.toString());
                            passbook({
                                userId: current_buy.userId,
                                coin: current_buy.secondCurrency,
                                currencyId: current_buy.secondCurrencyId,
                                tableId: current_buy._id,
                                beforeBalance: toFixedDown(beforeBAL, 8),
                                afterBalance: toFixedDown(buyRetrive, 8),
                                amount: parseFloat(retriveBal.toString()),
                                type: "spot_limit_bal_retrieve",
                                category: "credit",
                            });
                            socketEmitOne(
                                "updateTradeAsset",
                                {
                                    currencyId: current_buy.secondCurrencyId,
                                    spotBal: buyRetrive,
                                    inOrder: buyInOrder
                                },
                                current_buy.userId
                            );
                        }
                        current_buy.status = "completed";
                        let inOrderVal = (current_buy.price as number) * current_buy.filledQuantity;
                        buyInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                        hset(
                            "orderHistory_" + current_buy.userId,
                            current_buy._id,
                            current_buy
                        );
                        await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                        orderHistArr.push(current_buy);
                        buyOrders.shift();
                    } else {
                        current_buy.status = "pending";
                        let inOrderVal = (current_buy.price as number) * current_buy.filledQuantity;
                        buyInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                        orderHistArr.push(current_buy);
                        await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                        await hset(
                            "buyOpenOrders_" + current_buy.pairId,
                            current_buy._id,
                            current_buy
                        );
                    }

                    if (current_sell.quantity == 0) {
                        current_sell.status = "completed";
                        current_sell.triggerPrice = current_buy.price as number;
                        sellInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                        hset(
                            "orderHistory_" + current_sell.userId,
                            current_sell._id,
                            current_sell
                        );
                        await hdel(
                            "sellOpenOrders_" + current_sell.pairId,
                            current_sell._id
                        );
                        orderHistArr.push(current_sell);
                        sellOrders.shift();
                    } else {
                        current_sell.status = "pending";
                        sellInOrder = await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                        current_sell.triggerPrice = current_buy.price as number;
                        orderHistArr.push(current_sell);
                        await hdel(
                            "sellOpenOrders_" + current_sell.pairId,
                            current_sell._id
                        );
                        await hset(
                            "sellOpenOrders_" + current_sell.pairId,
                            current_sell._id,
                            current_sell
                        );
                    }
                    
                    //update for BUY
                    editOrderBook({
                        buyorsell: current_buy.buyorsell,
                        price: current_buy.price,
                        minusQuantity: exectamount,
                        pairId: current_buy.pairId,
                        firstFloatDigit: current_buy.firstFloatDigit,
                    });

                    //update for SELL
                    editOrderBook({
                        buyorsell: current_sell.buyorsell,
                        price: current_sell.price,
                        minusQuantity: exectamount,
                        pairId: current_sell.pairId,
                        firstFloatDigit: current_sell.firstFloatDigit,
                    });

                    passbook({
                        userId: current_buy.userId,
                        coin: current_buy.firstCurrency,
                        currencyId: current_buy.firstCurrencyId,
                        tableId: current_buy._id,
                        beforeBalance: toFixedDown(buyerWalletNum, 8),
                        afterBalance: toFixedDown((buyerWalletNum + (exectamount - buyFee)), 8),
                        amount: toFixedDown((exectamount - buyFee), 8),
                        type: "spot_limit_match",
                        category: "credit",
                    });
                    passbook({
                        userId: current_sell.userId,
                        coin: current_sell.secondCurrency,
                        currencyId: current_sell.secondCurrencyId,
                        tableId: current_sell._id,
                        beforeBalance: toFixedDown(sellerWalletNum, 8),
                        afterBalance: toFixedDown((sellerWalletNum + (execvalue - sellFee)), 8),
                        amount: parseFloat((execvalue - sellFee).toString()),
                        type: "spot_limit_match",
                        category: "credit",
                    });
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
                    ChartDocHistory({
                        pairName: pairData.tikerRoot,
                        price: avgPrice,
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

                    socketEmitOne(
                        "updateTradeAsset",
                        {
                            currencyId: current_buy.firstCurrencyId,
                            spotBal: buyerFinaleBalance,
                            inOrder: buyInOrder
                        },
                        current_buy.userId
                    );
                    socketEmitOne(
                        "updateTradeAsset",
                        {
                            currencyId: current_sell.secondCurrencyId,
                            spotBal: sellerFinaleBalance,
                            inOrder: sellInOrder
                        },
                        current_sell.userId
                    );
                    tradePair = "";
                    getOpenOrderSocket(current_sell.userId, current_sell.pairId);
                    getOpenOrderSocket(current_buy.userId, current_buy.pairId);
                    getOrderHistorySocket(current_buy.userId, current_buy.pairId);
                    getOrderHistorySocket(current_sell.userId, current_sell.pairId);
                }
                break;
            }
        }
        isRun = false;
        
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
                    cancelMarketOrder(`sellOpenOrders_${element.pairId}`, element._id);
                    return;
                }
            });
        }
        if (sellOrders.length <= 0) {
            buyOrders.forEach(async (element) => {
                if (
                    element.price === "market" &&
                    element.liquidityType == "off" &&
                    !element.isLiquidity
                ) {
                    cancelMarketOrder(`buyOpenOrders_${element.pairId}`, element._id);
                    return;
                }
            });
        }
        if (tradePair == pairData._id) tradePair = "";
    } catch (err) {
        console.log("----------------------TRADE MATCH ERR", err);
    }
};

export const marketMatching = async (
    buyOrders: OrderData[],
    sellOrders: OrderData[],
    current_buy: OrderData,
    current_sell: OrderData,
    pairData: PairData
): Promise<void> => {
    try {
        console.log("--------MARKET MATCH-----------");
        if (current_buy.liquidityType == 'off' && current_sell.liquidityType == 'off') {
            let uniqueId = Math.floor(Math.random() * 1000000000);
            let isMaker: 'buy' | 'sell' =
                current_buy.orderDate < current_sell.orderDate ? "buy" : "sell";
            let sellamount = current_sell.quantity;
            let buyerWallet = await hget(
                "walletbalance_spot",
                current_buy.userId + "_" + current_buy.firstCurrencyId
            );
            let buyerWalletNum = parseFloat(buyerWallet || '0');
            let sellerWallet = await hget(
                "walletbalance_spot",
                current_sell.userId + "_" + current_sell.secondCurrencyId
            );
            let sellerWalletNum = parseFloat(sellerWallet || '0');
            let exectamount = Math.min(current_buy.quantity, current_sell.quantity);
            let execvalue =
                isMaker == "buy"
                    ? exectamount * (current_buy.price as number)
                    : exectamount * (current_sell.price as number);
            let sellFee =
                isMaker == "sell"
                    ? execvalue * (current_buy.makerFee / 100)
                    : execvalue * (current_buy.takerFee / 100);
            let buyFee =
                isMaker == "buy"
                    ? exectamount * (current_sell.makerFee / 100)
                    : exectamount * (current_sell.takerFee / 100);
            let avgPrice = isMaker == "buy" ? (current_buy.price as number) : (current_sell.price as number);
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

            console.log(current_buy.quantity, '---current_buy.quantity')
            
            //order update process
            if (current_buy.quantity == 0) {
                current_buy.status = "completed";
                if (!current_buy.flag) {
                    let inOrderVal = (current_buy.price as number) * current_buy.filledQuantity;
                    await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                }

                let retriveBal = parseFloat((current_buy.openOrderValue || 0).toString()) - parseFloat(current_buy.averagePrice.toString());

                if (retriveBal > 0) {
                    if (current_buy.liquidityType == "off" && !current_buy.isLiquidity) {
                        let buyRetrive = await hincbyfloat(
                            "walletbalance_spot",
                            current_buy.userId + "_" + current_buy.secondCurrencyId,
                            retriveBal
                        );

                        let beforeBAL = parseFloat(buyRetrive.toString()) - parseFloat(retriveBal.toString());
                        passbook({
                            userId: current_buy.userId,
                            coin: current_buy.secondCurrency,
                            currencyId: current_buy.secondCurrencyId,
                            tableId: current_buy._id,
                            beforeBalance: toFixedDown(beforeBAL, 8),
                            afterBalance: toFixedDown(buyRetrive, 8),
                            amount: parseFloat(retriveBal.toString()),
                            type: "spot_market_bal_retrieve_buy",
                            category: "credit",
                        });
                        socketEmitOne(
                            "updateTradeAsset",
                            {
                                currencyId: current_buy.secondCurrencyId,
                                spotBal: buyRetrive,
                            },
                            current_buy.userId
                        );
                    }
                }

                hset("orderHistory_" + current_buy.userId, current_buy._id, current_buy);
                await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                newOrderHistory(current_buy);
                buyOrders.shift();
            } else {
                if (current_buy.flag == true) {
                    let checkLimit = (element: OrderData) => element._id !== current_sell._id;
                    let checkOrder = sellOrders.findIndex(checkLimit);
                    let retriveBal = parseFloat((current_buy.openOrderValue || 0).toString()) - parseFloat(current_buy.averagePrice.toString());
                    current_buy.orderValue = retriveBal;
                    current_buy.quantity = 0;
                    console.log(checkOrder, '---checkOrder')
                    console.log(retriveBal, '---retriveBal')
                    if (retriveBal > 0 && checkOrder == -1) {
                        if (current_buy.liquidityType == "off" && !current_buy.isLiquidity) {
                            current_buy.status = "completed";
                            hset(
                                "orderHistory_" + current_buy.userId,
                                current_buy._id,
                                current_buy
                            );
                            let buyRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_buy.userId + "_" + current_buy.secondCurrencyId,
                                retriveBal
                            );
                            await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                            let beforeBAL = parseFloat(buyRetrive.toString()) - parseFloat(retriveBal.toString());
                            passbook({
                                userId: current_buy.userId,
                                coin: current_buy.secondCurrency,
                                currencyId: current_buy.secondCurrencyId,
                                tableId: current_buy._id,
                                beforeBalance: toFixedDown(beforeBAL, 8),
                                afterBalance: toFixedDown(buyRetrive, 8),
                                amount: parseFloat(retriveBal.toString()),
                                type: "spot_market_bal_retrieve_buy",
                                category: "credit",
                            });
                            newOrderHistory(current_buy);
                            socketEmitOne(
                                "updateTradeAsset",
                                {
                                    currencyId: current_buy.secondCurrencyId,
                                    spotBal: buyRetrive,
                                },
                                current_buy.userId
                            );
                        }
                    } else {
                        current_buy.price = "market";
                        console.log("-------------- ELSE REOPEN BUY");
                        current_buy.status = "pending";
                        await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                        await hset(
                            "buyOpenOrders_" + current_buy.pairId,
                            current_buy._id,
                            current_buy
                        );
                        newOrderHistory(current_buy);
                    }
                } else {
                    console.log("-------------- ELSE DOWN REOPEN BUY");
                    current_buy.status = "pending";
                    let inOrderVal = (current_buy.price as number) * current_buy.filledQuantity;
                    await hincbyfloat("walletbalance_spot_inOrder", current_buy.userId + "_" + current_buy.secondCurrencyId, -inOrderVal);
                    await hdel("buyOpenOrders_" + current_buy.pairId, current_buy._id);
                    await hset(
                        "buyOpenOrders_" + current_buy.pairId,
                        current_buy._id,
                        current_buy
                    );
                    newOrderHistory(current_buy);
                }
            }
            
            if (current_sell.quantity == 0) {
                console.log("--------------COMPLETE SELL");
                current_sell.status = "completed";
                if (!current_sell.flag) {
                    await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                }
                hset(
                    "orderHistory_" + current_sell.userId,
                    current_sell._id,
                    current_sell
                );
                await hdel("sellOpenOrders_" + current_sell.pairId, current_sell._id);
                newOrderHistory(current_sell);
                sellOrders.shift();
            } else {
                if (current_sell.flag == true) {
                    let checkLimit = (element: OrderData) => element._id !== current_sell._id;
                    let checkOrder = buyOrders.findIndex(checkLimit);
                    let retriveBal = sellamount - exectamount;
                    current_sell.price = "market";
                    current_sell.amount = current_sell.quantity;
                    if (retriveBal > 0 && checkOrder == -1) {
                        if (current_sell.liquidityType == "off") {
                            current_sell.status = "completed";
                            hset(
                                "orderHistory_" + current_sell.userId,
                                current_sell._id,
                                current_sell
                            );
                            let sellRetrive = await hincbyfloat(
                                "walletbalance_spot",
                                current_sell.userId + "_" + current_sell.firstCurrencyId,
                                retriveBal
                            );
                            await hdel(
                                "sellOpenOrders_" + current_sell.pairId,
                                current_sell._id
                            );
                            let beforeBAL = parseFloat(sellRetrive.toString()) - parseFloat(retriveBal.toString());
                            passbook({
                                userId: current_sell.userId,
                                coin: current_sell.firstCurrency,
                                currencyId: current_sell.firstCurrencyId,
                                tableId: current_sell._id,
                                beforeBalance: toFixedDown(beforeBAL, 8),
                                afterBalance: toFixedDown(sellRetrive, 8),
                                amount: parseFloat(retriveBal.toString()),
                                type: "spot_market_bal_retrieve_sell",
                                category: "credit",
                            });
                            newOrderHistory(current_sell);
                            socketEmitOne(
                                "updateTradeAsset",
                                {
                                    currencyId: current_sell.firstCurrencyId,
                                    spotBal: sellRetrive,
                                },
                                current_sell.userId
                            );
                        }
                    } else {
                        console.log("-------------- ELSE REOPEN SELL");
                        current_sell.status = "pending";
                        await hdel("sellOpenOrders_" + current_sell.pairId, current_sell._id);
                        await hset(
                            "sellOpenOrders_" + current_sell.pairId,
                            current_sell._id,
                            current_sell
                        );
                        newOrderHistory(current_sell);
                    }
                } else {
                    console.log("-------------- ELSE DOWN REOPEN SELL");
                    current_sell.status = "pending";
                    await hincbyfloat("walletbalance_spot_inOrder", current_sell.userId + "_" + current_sell.firstCurrencyId, -current_sell.filledQuantity);
                    await hdel("sellOpenOrders_" + current_sell.pairId, current_sell._id);
                    await hset(
                        "sellOpenOrders_" + current_sell.pairId,
                        current_sell._id,
                        current_sell
                    );
                    newOrderHistory(current_sell);
                }
            }
            
            /* START IGNORE TRADE FEE */
            let buyUsrDoc = await hget("userToken_" + current_buy.userId, current_buy.userId);
            let sellUsrDoc = await hget("userToken_" + current_sell.userId, current_sell.userId);
            
            if (buyUsrDoc) {
                let buyUsrDocParsed: UserDoc = JSON.parse(buyUsrDoc);
                if (buyUsrDocParsed.feeManagement?.includes(current_buy.firstCurrencyId)) {
                    buyFee = 0;
                }
            }

            if (sellUsrDoc) {
                let sellUsrDocParsed: UserDoc = JSON.parse(sellUsrDoc);
                if (sellUsrDocParsed.feeManagement?.includes(current_sell.secondCurrencyId)) {
                    sellFee = 0;
                }
            }
            /* END IGNORE TRADE FEE */
            
            //Order Book update for BUY
            if (current_sell.flag == true) {
                editOrderBook({
                    buyorsell: current_buy.buyorsell,
                    price: current_buy.price,
                    minusQuantity: exectamount,
                    pairId: current_buy.pairId,
                    firstFloatDigit: pairData.firstFloatDigit,
                });
            }
            passbook({
                userId: current_buy.userId,
                coin: current_buy.firstCurrency,
                currencyId: current_buy.firstCurrencyId,
                tableId: current_buy._id,
                beforeBalance: toFixedDown(buyerWalletNum, 8),
                afterBalance: toFixedDown((buyerWalletNum + (exectamount - buyFee)), 8),
                amount: parseFloat((exectamount - buyFee).toString()),
                type: "spot_market_match",
                category: "credit",
            });
            
            //Order Book update for SELL
            if (current_buy.flag == true) {
                editOrderBook({
                    buyorsell: current_sell.buyorsell,
                    price: current_sell.price,
                    minusQuantity: exectamount,
                    pairId: current_sell.pairId,
                    firstFloatDigit: pairData.firstFloatDigit,
                });
            }
            passbook({
                userId: current_sell.userId,
                coin: current_sell.secondCurrency,
                currencyId: current_sell.secondCurrencyId,
                tableId: current_sell._id,
                beforeBalance: toFixedDown(sellerWalletNum, 8),
                afterBalance: toFixedDown((sellerWalletNum + (execvalue - sellFee)), 8),
                amount: parseFloat((execvalue - sellFee).toString()),
                type: "spot_market_match",
                category: "credit",
            });
            
            // Trade History
            newTradeHistory({
                buyOrderData: current_buy,
                sellOrderData: current_sell,
                uniqueId: uniqueId,
                execPrice: avgPrice,
                Maker: isMaker,
                buyerFee: buyFee,
                sellerFee: sellFee,
                execQuantity: exectamount,
                ordertype: "Market",
            });
            
            ChartDocHistory({
                pairName: pairData.tikerRoot,
                price: avgPrice,
            });
            
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
            
            getOpenOrderSocket(current_sell.userId, current_sell.pairId);
            getOpenOrderSocket(current_buy.userId, current_buy.pairId);
            getOrderHistorySocket(current_buy.userId, current_buy.pairId);
            getOrderHistorySocket(current_sell.userId, current_sell.pairId);
            
            socketEmitOne(
                "updateTradeAsset",
                {
                    currencyId: current_buy.firstCurrencyId,
                    spotBal: buyWallet,
                },
                current_buy.userId
            );
            socketEmitOne(
                "updateTradeAsset",
                {
                    currencyId: current_sell.secondCurrencyId,
                    spotBal: sellWallet,
                },
                current_sell.userId
            );
        }
    } catch (err) {
        console.log(err, "-----------------Market match error");
    }
};
