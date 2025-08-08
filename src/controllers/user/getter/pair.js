import Pair from '@/models/schema/pair';
import isEmpty from '@/lib/isEmpty';
import { paginationQuery } from '@/utils/general';
import { columnFillter } from '@/lib/adminHelpers';

const safeJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

class PairController {
  async spotPairList(c) {
    try {
      const query = c.req.query();
      const pagination = paginationQuery(query);
      const sortObj = !isEmpty(query?.sortObj)
        ? safeJson(query.sortObj, { _id: -1 })
        : { _id: -1 };

      // columnFillter expects query.fillter as a JSON string
      const filter = columnFillter({
        ...query,
        fillter: query?.fillter ?? '{}',
      });

      const count = await Pair.countDocuments(filter);
      const data = await Pair.find(
        filter,
        {
          baseId: 1,
          baseSymbol: 1,
          baseDecimal: 1,
          quoteId: 1,
          quoteSymbol: 1,
          quoteDecimal: 1,
          minPricePerc: 1,
          maxPricePerc: 1,
          minQty: 1,
          maxQty: 1,
          makerFee: 1,
          takerFee: 1,
          marketPrice: 1,
          markup: 1,
          status: 1,
          change: 1,
        }
      )
        .skip(pagination.skip)
        .limit(pagination.limit)
        .sort(sortObj);

      return c.json({ success: true, messages: 'success', result: { count, data } }, 200);
    } catch (err) {
      return c.json({ success: false, errors: { messages: 'Error on server' } }, 500);
    }
  }

  async findById(c) {
    try {
      const { id } = c.req.param();
      const data = await Pair.findOne(
        { _id: id },
        {
          baseId: 1,
          baseSymbol: 1,
          baseDecimal: 1,
          quoteId: 1,
          quoteSymbol: 1,
          quoteDecimal: 1,
          minPricePerc: 1,
          maxPricePerc: 1,
          minQty: 1,
          maxQty: 1,
          makerFee: 1,
          takerFee: 1,
          marketPrice: 1,
          markup: 1,
          status: 1,
          change: 1,
        }
      );
      return c.json({ success: true, messages: 'success', result: data }, 200);
    } catch (err) {
      return c.json({ success: false, errors: { messages: 'Error on server' } }, 500);
    }
  }

  async getAllMarkPrice() {
    const pairData = await Pair.find({}, { _id: 0, tikerRoot: 1, marketPrice: 1 });
    return { result: pairData };
  }

  async fetchPairData (id = null) {
    if (id == null) {
      return;
    }
    let pairdetials = await hget("spotPairdata", id.toString());
  
    if (!pairdetials) {
      let spotPairData = await SpotPair.find({}).lean();
  
      if (spotPairData && spotPairData.length > 0) {
        for (let i = 0; i < spotPairData.length; i++) {
          if (spotPairData[i]._id.toString() == id.toString()) {
            await hset(
              "spotPairdata",
              spotPairData[i]._id.toString(),
              spotPairData[i]
            );
            return spotPairData[i];
          }
        }
      }
    } else {
      return JSON.parse(pairdetials);
    }
  };
  
}

export default PairController;