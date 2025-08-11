import { getRepository } from "../../models/repositoryFactory.js";
import { PairModel } from "../../models/schema/index.js";
import { recentTradeWS } from "./ws.js";

export class PairController {
  constructor() {
    this.pairRepo = getRepository(PairModel);
  }

  spotPairList = async (req, res) => {
    try {
      let pagination = paginationQuery(req.query);
      let filter = columnFillter(req.query, req.headers.timezone);
      let sortObj = !isEmpty(JSON.parse(req.query.sortObj))
        ? JSON.parse(req.query.sortObj)
        : { _id: -1 };
      let count = await this.pairRepo.countDocuments(filter);
      let data = await this.pairRepo
        .find(filter, {
          firstCurrencyId: 1,
          firstCurrencySymbol: 1,
          firstFloatDigit: 1,
          secondCurrencyId: 1,
          secondCurrencySymbol: 1,
          secondFloatDigit: 1,
          minPricePercentage: 1,
          maxPricePercentage: 1,
          minQuantity: 1,
          maxQuantity: 1,
          maker_rebate: 1,
          taker_fees: 1,
          markPrice: 1,
          markupPercentage: 1,
          botstatus: 1,
          status: 1,
          marketPercent: 1,
        })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .sort(sortObj);

      let result = {
        count,
        data,
      };
      return res
        .status(200)
        .json({ success: true, messages: "success", result });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, errors: { messages: "Error on server" } });
    }
  };

  findById = async (req, res) => {
    try {
      let data = await this.pairRepo.findOne(
        {
          _id: req.params.id,
        },
        {
          firstCurrencyId: 1,
          firstCurrencySymbol: 1,
          firstFloatDigit: 1,
          secondCurrencyId: 1,
          secondCurrencySymbol: 1,
          secondFloatDigit: 1,
          minPricePercentage: 1,
          maxPricePercentage: 1,
          minQuantity: 1,
          maxQuantity: 1,
          minOrderValue: 1,
          maxOrderValue: 1,
          maker_rebate: 1,
          taker_fees: 1,
          markPrice: 1,
          markupPercentage: 1,
          botstatus: 1,
          status: 1,
          marketPercent: 1,
        }
      );
      return res
        .status(200)
        .json({ success: true, messages: "success", result: data });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, errors: { messages: "Error on server" } });
    }
  };

  getAllMarkPrice = async (reqbody) => {
    let pairData = await Pair.find({}, { _id: 0, tikerRoot: 1, markPrice: 1 });
    return {
      result: pairData,
    };
  };
}
export default PairController;
