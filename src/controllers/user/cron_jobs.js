export const depthData = async () => {
  let initial = [{ price: 0, volume: 0 }];
  let data = {};

  for (let i = 0; i < pairInfo.length; i++) {
    if (pairInfo[i].botstatus == "binance") {
      let buyDepth = await lrange(`buy_depth_binance_${pairInfo[i]._id}`);
      let sellDepth = await lrange(`sell_depth_binance_${pairInfo[i]._id}`);

      if (!isEmpty(buyDepth)) {
        buyDepth = await getvalueObj(buyDepth);
        buyDepth = buyDepth.sort((a, b) => b.price - a.price);
      }
      if (!isEmpty(sellDepth)) {
        sellDepth = await getvalueObj(sellDepth);
        sellDepth = sellDepth.sort((a, b) => a.price - b.price);
      }
      data = {
        pairId: pairInfo[i]._id,
        buy: buyDepth?.length > 20 ? buyDepth : initial,
        sell: sellDepth?.length > 20 ? sellDepth : initial,
      };
    } else {
      let buyDepth = await lrange("buy_depth_" + pairInfo[i]._id);
      let sellDepth = await lrange("sell_depth_" + pairInfo[i]._id);
      if (!isEmpty(buyDepth)) {
        buyDepth = await getvalueObj(buyDepth);
        buyDepth = buyDepth.sort((a, b) => b.price - a.price);
      }
      if (!isEmpty(sellDepth)) {
        sellDepth = await getvalueObj(sellDepth);
        sellDepth = sellDepth.sort((a, b) => a.price - b.price);
      }
      data = {
        pairId: pairInfo[i]._id,
        buy: buyDepth?.length > 0 ? buyDepth : initial,
        sell: sellDepth?.length > 0 ? sellDepth : initial,
      };
    }
    socketEmitOne("depthChart", data, "depthChart");
  }
};


export const clearSpotRedis = async () => {
  try {
    let tradeDoc,
      tradeArr = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    let orderHistDoc = await spotOrderHistory.find({
      createdAt: { $gte: sevenDaysAgo },
      status: { $in: ["completed", "cancel"] },
    });
    let pairDoc = await SpotPair.find({}).distinct("_id");
    if (pairDoc?.length > 0) {
      for (let item of pairDoc) {
        tradeDoc = await hgetall("tradeHistory_" + item.toString());
        if (tradeDoc) {
          tradeDoc = await getvalueObj(tradeDoc);
          tradeArr = tradeArr.concat(...tradeDoc);
        }
      }
    }
    if (orderHistDoc?.length > 0) {
      for (let item of orderHistDoc) {
        await hdel("orderHistory_" + item.userId, item._id);
      }
    }
    if (tradeArr?.length > 0) {
      for (let item of tradeArr) {
        await hdel("tradeHistory_" + item.pairId, item.uniqueId);
      }
    }
  } catch (err) {
    console.log("err: ", err);
  }
};