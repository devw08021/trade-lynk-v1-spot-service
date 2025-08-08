export const getGainerLooser = async (req, res) => {
  try {
    let gainData = [];
    let lossData = [];
    let spotPairDoc = await hgetall("spotPairdata");
    if (spotPairDoc) {
      spotPairDoc = await getActivePairs(spotPairDoc);
    }
    if (spotPairDoc?.length > 0) {
      for (let i = 0; i < spotPairDoc.length; i++) {
        await marketPrice(spotPairDoc[i]._id);
        let changesDoc = await hget("spot24hrsChange", spotPairDoc[i]._id);
        changesDoc = JSON.parse(changesDoc);
        let sy = "";
        if (changesDoc?.change > 0) {
          sy = "+";
        }
        let data = {
          pairId: spotPairDoc[i]._id,
          CoinName: `${spotPairDoc[i]?.firstCurrencySymbol}/${spotPairDoc[i]?.secondCurrencySymbol}`,
          Price: parseFloat(changesDoc?.last).toFixed(4),
          Percent: sy + parseFloat(changesDoc?.change).toFixed(4) + "%",
          Percentage: sy + parseFloat(changesDoc?.change).toFixed(4),
        };
        if (changesDoc.change > 0) {
          gainData.push(data);
        } else {
          lossData.push(data);
        }
      }
    }
    let result = {
      gain: gainData,
      loss: lossData,
    };
    return res.status(200).json({ success: true, messages: "success", result });
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).json({ status: false, message: "Error occured" });
  }
};
/**
 * Get getfavpair
 * URL : /dashboard/gainerLooser
 * METHOD : GET
 */
export const getfavpair = async (req, res) => {
  try {
    let favpair = await FavPair.find({
      userId: req.user.id,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Fetch successfully",
        result: favpair && favpair[0] ? favpair[0].pairlist : [],
      });
  } catch (err) {
    console.log(err, "vkrs sqwq");
    return res.status(500).json({ status: false, message: "Error occured" });
  }
};
