import { hget, hset } from '../../config/redis.js'
import { PairModel } from '../../models/schema/index.js'
import { getRepository } from '../../models/repositoryFactory.js'
import { isEmpty } from 'lodash'
import { replacePair } from '../../utils/index.js'
import { socketEmitOne } from '../../config/socketIO.js'
import { binanceApiNode } from '../../config/binance.js'

const pairRepo = getRepository(PairModel)
let partialDepth, markDepth, RecentDepth;

export const spotOrderBookWS = async () => {
    try {
      console.log(partialDepth, "---partialDepth")
      if (partialDepth) {
        partialDepth();
      }
      let getSpotPair = await pairRepo.aggregate([
        {
          $match: { botstatus: "off" }
        },
        { 
          $project: {
            _id: 1,
            symbol: {
              $concat: [
                "$firstCurrencySymbol",
                {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$secondCurrencySymbol", "USD"] },
                        then: "USDT",
                      },
                    ],
                    default: "$secondCurrencySymbol",
                  },
                },
              ],
            },
            level: { $literal: 20 },
            markupPercentage: 1,
          },
        },
      ]);
      console.log(getSpotPair, "------77");
  
      if (getSpotPair && getSpotPair.length > 0) {
        partialDepth = binanceApiNode.ws.partialDepth(
          getSpotPair,
          async (depth) => {
            if (depth) {
              let pairData = getSpotPair.find((el) => el.symbol == depth.symbol);
              if (pairData) {
                // sell order book
                let sellOrder = [],
                  binanceSellOrder = depth.asks;
                for (let sellItem of binanceSellOrder) {
                  sellOrder.push({
                    _id: sellItem.price,
                    quantity: parseFloat(sellItem.quantity),
                    filledQuantity: 0,
                  });
                  // }
                }
  
                sellOrder = sellOrder.sort(
                  (a, b) => parseFloat(a.price) - parseFloat(b.price)
                );
  
                if (sellOrder.length > 0) {
                  let sumAmount = 0;
                  for (let i = 0; i < sellOrder.length; i++) {
                    let quantity =
                      parseFloat(sellOrder[i].quantity) -
                      parseFloat(sellOrder[i].filledQuantity);
                    sumAmount = parseFloat(sumAmount) + parseFloat(quantity);
                    sellOrder[i].total = sumAmount;
                    sellOrder[i].quantity = quantity;
                  }
                }
                sellOrder = sellOrder;
  
                // buy order book
                let buyOrder = [],
                  binanceBuyOrder = depth.bids;
  
                for (let buyItem of binanceBuyOrder) {
                  buyOrder.push({
                    _id: buyItem.price,
                    quantity: parseFloat(buyItem.quantity),
                    filledQuantity: 0,
                  });
                  // }
                }
  
                buyOrder = buyOrder.sort(
                  (a, b) => parseFloat(b._id) - parseFloat(a._id)
                );
                if (buyOrder.length > 0) {
                  let sumAmount = 0;
                  for (let i = 0; i < buyOrder.length; i++) {
                    let quantity =
                      parseFloat(buyOrder[i].quantity) -
                      parseFloat(buyOrder[i].filledQuantity);
                    sumAmount = parseFloat(sumAmount) + parseFloat(quantity);
                    buyOrder[i].total = sumAmount;
                    buyOrder[i].quantity = quantity;
                  }
                }

                socketEmitOne(
                  "orderBook",
                  {
                    timestamp: Date.now(),
                    symbol: pairData.symbol,
                    pairId: pairData._id,
                    sellOrder: sellOrder,
                    buyOrder: buyOrder,
                  },
                  pairData.symbol
                );
              }
            }
          }
        );
      }
    } catch (err) {
      console.log("Error on websocketcall in binanceHelper ", err);
    }
  };
  
export const spotTickerPriceWS = async () => {
    try {
      if (markDepth) {
        markDepth();
      }
      let getSpotPair = await pairRepo.aggregate([
        {
          $match: { botstatus: "off" }
        },
        {
          $group: {
            _id: null,
            symbol: {
              $push: {
                $concat: [
                  "$firstCurrencySymbol",
                  {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ["$secondCurrencySymbol", "USD"] },
                          then: "USDT",
                        },
                      ],
                      default: "$secondCurrencySymbol",
                    },
                  },
                ],
              },
            },
            pairData: {
              $push: {
                pairId: "$_id",
                symbol: {
                  $concat: [
                    "$firstCurrencySymbol",
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $eq: ["$secondCurrencySymbol", "USD"] },
                            then: "USDT",
                          },
                        ],
                        default: "$secondCurrencySymbol",
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]);
      if (
        getSpotPair &&
        getSpotPair.length > 0 &&
        getSpotPair[0].symbol &&
        getSpotPair[0].symbol.length > 0
      ) {
        markDepth = binanceApiNode.ws.ticker(
          getSpotPair[0].symbol,
          async (tickerdata) => {
            let pairData = getSpotPair[0].pairData.find(
              (el) => el.symbol == tickerdata.symbol
            );
            if (pairData) {
              let updateSpotPair = await pairRepo.findOneAndUpdate(
                {
                  _id: pairData.pairId,
                },
                {
                  low: tickerdata.low,
                  high: tickerdata.high,
                  changePrice: tickerdata.priceChange,
                  change: tickerdata.priceChangePercent,
                  firstVolume: tickerdata.volume,
                  secondVolume: tickerdata.volumeQuote,
                  last: tickerdata.bestBid,
                  markPrice: tickerdata.bestBid,
                  last_ask: tickerdata.bestAsk,
                  last_bid: tickerdata.bestBid,
                },
                {
                  new: true,
                  fields: {
                    last: 1,
                    markPrice: 1,
                    low: 1,
                    high: 1,
                    firstVolume: 1,
                    secondVolume: 1,
                    changePrice: 1,
                    change: 1,
                    botstatus: 1,
                    secondCurrencySymbol: 1,
                    firstCurrencySymbol: 1
                  },
                }
              ).lean();
              // updateSpotPair = updateSpotPair.toJSON()
              let pairDoc = await hget(
                "spotPairdata",
                updateSpotPair._id.toString()
              );
              if (!isEmpty(pairDoc)) {
                pairDoc = await JSON.parse(pairDoc);
                pairDoc["last"] = updateSpotPair.last;
                pairDoc["markPrice"] = updateSpotPair.markPrice;
                pairDoc["low"] = updateSpotPair.low;
                pairDoc["high"] = updateSpotPair.high;
                pairDoc["firstVolume"] = updateSpotPair.firstVolume;
                pairDoc["secondVolume"] = updateSpotPair.secondVolume;
                pairDoc["changePrice"] = updateSpotPair.changePrice;
                pairDoc["change"] = updateSpotPair.change;
                await hset(
                  "spotPairdata",
                  updateSpotPair._id.toString(),
                  pairDoc
                );
              }
              socketEmitOne(
                "marketPrice",
                {
                  pairId: pairData.pairId,
                  data: updateSpotPair,
                },
                "spot"
              );
              await hset(
                "spot24hrsChange",
                updateSpotPair._id.toString(),
                updateSpotPair
              );
              // triggerStopLimitOrder(updateSpotPair);
              // trailingStopOrder(updateSpotPair);
            }
          }
        );
      }
    } catch (err) {
      console.log("Error on ticker binance ", err);
    }
  };

export const recentTradeWS = async (pairList) => {
    try {
      if (RecentDepth) {
        RecentDepth();
      }
      console.log(pairList, "---------1412");
      let symbolList = lodash.map(pairList, (item) => {
        return item.firstCurrencySymbol + replacePair(item.secondCurrencySymbol);
      });
  
      if (symbolList && symbolList.length > 0) {
        RecentDepth = binanceApiNode.ws.trades(symbolList, async (trade) => {
          if (trade) {
            let pairData = pairList.find(
              (el) =>
                el.firstCurrencySymbol + replacePair(el.secondCurrencySymbol) ==
                trade.symbol
            );
            let recentTrade = [
              {
                createdAt: new Date(trade.tradeTime),
                Type: trade.isBuyerMaker ? "buy" : "sell",
                tradePrice: trade.price,
                tradeQty: trade.quantity,
              },
            ];
            setDepthBinanceHist(
              {
                PairId: pairData._id,
                tradePrice: trade.price,
                tradeQty: trade.quantity,
              },
              trade.isBuyerMaker ? "buy" : "sell"
            );
            let pair =
              pairData.firstCurrencySymbol + pairData.secondCurrencySymbol;
            socketEmitOne(
              "recentTrade",
              {
                pairId: pairData._id,
                data: recentTrade,
              },
              pair
            );
          }
        });
      }
    } catch (err) {
      console.log(err, "Error on recentTradeWS");
    }
  };

export const recentTrade = async ({
    firstCurrencySymbol,
    secondCurrencySymbol,
  }) => {
    try {
      secondCurrencySymbol = replacePair(secondCurrencySymbol);
      let recentTradeData = await binanceApiNode.trades({
        symbol: firstCurrencySymbol + secondCurrencySymbol,
        limit: 50,
      });
      let recentTrade = [];
      recentTradeData.filter((el) => {
        recentTrade.push({
          createdAt: new Date(el.time),
          Type: el.isBuyerMaker ? "buy" : "sell",
          tradePrice: el.price,
          tradeQty: el.qty,
        });
      });
  
      return recentTrade;
    } catch (err) {
      console.log("err: ", err);
      console.log("\x1b[31m", "Error on binance trade list");
      return [];
    }
  };