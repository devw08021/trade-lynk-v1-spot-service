import { PairModel } from "@/models/schema";
import { Hono } from "hono";
import { env as config } from "@/config/env";
import { hsetField as hset } from "@/config/redis";
import { currencyId } from "@/grpc/services/currencyService";
import { spotOrderBookWS, spotTickerPriceWS } from "@/controllers/user/ws";
import PairController from "@/controllers/user/getter/pair";

// import binanceCtrl,spotTradeCtrl,isEmpty

class AdminPairController {
  constructor() {
    this.pairRepo = getRepository(PairModel);
    this.pairCtrl = new PairController();
  }

  addSpotPair = async (c) => {
    const reqBody = await c.req.json();
    try {
      const firstCurrencyData = await currencyId({
        id: reqBody.firstCurrencyId,
      });
      if (!firstCurrencyData) {
        return c.json(
          { success: false, errors: { firstCurrencyId: "Invalid Currency" } },
          400
        );
      }
      const secondCurrencyData = await currencyId({
        id: reqBody.secondCurrencyId,
      });
      if (!secondCurrencyData) {
        return c.json(
          { success: false, errors: { secondCurrencyId: "Invalid Currency" } },
          400
        );
      }

      const exists = await this.pairRepo.findOne({
        firstCurrencyId: reqBody.firstCurrencyId,
        secondCurrencyId: reqBody.secondCurrencyId,
      });

      if (exists) {
        return c.json(
          {
            success: false,
            errors: { firstCurrencyId: "Currency Pair Already Exists" },
          },
          400
        );
      }

      const doc = {
        tikerRoot: `${firstCurrencyData.coin}${secondCurrencyData.coin}`,
        firstCurrencyId: reqBody.firstCurrencyId,
        firstCurrencySymbol: firstCurrencyData.coin,
        firstFloatDigit: parseInt(reqBody.firstFloatDigit),
        secondCurrencyId: reqBody.secondCurrencyId,
        secondCurrencySymbol: secondCurrencyData.coin,
        secondFloatDigit: parseInt(reqBody.secondFloatDigit),
        minPricePercentage: reqBody.minPricePercentage,
        maxPricePercentage: reqBody.maxPricePercentage,
        minQuantity: reqBody.minQuantity,
        maxQuantity: reqBody.maxQuantity,
        minOrderValue: reqBody.minOrderValue,
        maxOrderValue: reqBody.maxOrderValue,
        maker_rebate: reqBody.maker_rebate,
        markPrice: reqBody.markPrice,
        taker_fees: reqBody.taker_fees,
        markupPercentage: reqBody.markupPercentage,
        botstatus: reqBody.botstatus,
        marketPercent: reqBody.marketPercent,
        status: "active",
      };

      const created = await this.pairRepo.create(doc);

      const obj = {
        _id: created._id,
        firstCurrencyImage:
          config.WALLET_URL +
          config.IMAGE.CURRENCY_URL_PATH +
          firstCurrencyData.image,
        secondCurrencyImage:
          config.WALLET_URL +
          config.IMAGE.CURRENCY_URL_PATH +
          secondCurrencyData.image,
      };

      //   this.symbolDatabase?.initialChartSymbol?.(); // #TODO_CHART_WORKS (once the chart works has been complete remove this comment)
      await hset("spotPairdata", String(created._id), { ...doc, ...obj });

      // kick market data consumers and aggregates
      this.pairCtrl?.getSpotPair();
      spotOrderBookWS?.();
      spotTickerPriceWS?.();
      this.pairCtrl.fetchAllpairs();

      return c.json(
        {
          success: true,
          message: "Pair Added Successfully. Refreshing Data...",
        },
        200
      );
    } catch (err) {
      console.error(err, "err");
      return c.json({ success: false, message: "Error On Server" }, 500);
    }
  };

  editSpotPair = async (c) => {
    const reqBody = await c.req.json();
    try {
      //   if (reqBody.botstatus !== "bot") {
      //     const botDoc = await this.TradeBot.findOne({
      //       pairId: reqBody.pairId,
      //       status: "active",
      //     });
      //     if (!this.isEmpty(botDoc)) {
      //       return c.json(
      //         {
      //           success: false,
      //           message:
      //             "A trade bot is already active for the specified pair. Please turn off the existing bot before starting a liqudity.",
      //         },
      //         400
      //       );
      //     }
      //   }

      const firstCurrencyData = await currencyId({
        id: reqBody.firstCurrencyId,
      });
      if (!firstCurrencyData) {
        return c.json(
          { success: false, errors: { firstCurrencyId: "Invalid Currency" } },
          400
        );
      }
      const secondCurrencyData = await currencyId({
        id: reqBody.secondCurrencyId,
      });
      if (!secondCurrencyData) {
        return c.json(
          { success: false, errors: { secondCurrencyId: "Invalid Currency" } },
          400
        );
      }

      const dup = await this.pairRepo.findOne({
        firstCurrencyId: reqBody.firstCurrencyId,
        secondCurrencyId: reqBody.secondCurrencyId,
        _id: { $ne: reqBody.pairId },
      });
      if (dup) {
        return c.json(
          {
            success: false,
            errors: { firstCurrencyId: "Currency Pair  Already Exists" },
          },
          400
        );
      }

      const doc = {
        _id: reqBody.pairId,
        tikerRoot: `${firstCurrencyData.coin}${secondCurrencyData.coin}`,
        firstCurrencyId: reqBody.firstCurrencyId,
        firstCurrencySymbol: firstCurrencyData.coin,
        firstFloatDigit: parseInt(reqBody.firstFloatDigit),
        secondCurrencyId: reqBody.secondCurrencyId,
        secondCurrencySymbol: secondCurrencyData.coin,
        secondFloatDigit: parseInt(reqBody.secondFloatDigit),
        minPricePercentage: reqBody.minPricePercentage,
        maxPricePercentage: reqBody.maxPricePercentage,
        minQuantity: reqBody.minQuantity,
        maxQuantity: reqBody.maxQuantity,
        minOrderValue: reqBody.minOrderValue,
        maxOrderValue: reqBody.maxOrderValue,
        maker_rebate: reqBody.maker_rebate,
        taker_fees: reqBody.taker_fees,
        markPrice: reqBody.markPrice,
        markupPercentage: reqBody.markupPercentage,
        botstatus: reqBody.botstatus,
        status: reqBody.status,
        marketPercent: reqBody.marketPercent,
      };

      const updateDoc = await this.pairRepo.findOneAndUpdate(
        { _id: reqBody.pairId },
        doc
      );
      //   this.symbolDatabase?.initialChartSymbol?.(); // #TODO_CHART_WORKS (once the chart works has been complete remove this comment)

      getSpotPair();
      spotOrderBookWS();
      spotTickerPriceWS();

      //   await this.VolumeBot.findOneAndUpdate(
      //     { pairId: reqBody.pairId },
      //     { count: 0, currentSide: "", lastMarketPrice: reqBody.markPrice }
      //   );

      const obj = {
        firstCurrencyImage:
          config.WALLET_URL +
          config.IMAGE.CURRENCY_URL_PATH +
          firstCurrencyData.image,
        secondCurrencyImage:
          config.WALLET_URL +
          config.IMAGE.CURRENCY_URL_PATH +
          secondCurrencyData.image,
      };

      await hset("spotPairdata", String(updateDoc._id), {
        ...doc,
        ...obj,
      });
      this.pairCtrl.fetchAllpairs();

      return c.json(
        {
          success: true,
          message: "Pair Updated Successfully. Refreshing Data...",
        },
        200
      );
    } catch (err) {
      console.error(err, "err");
      return c.json({ success: false, message: "Error on server" }, 500);
    }
  };
}

export const adminPairCtrl = new AdminPairController();
export default adminPairCtrl;

export const addSpotPair = adminPairCtrl.addSpotPair.bind(adminPairCtrl);
export const editSpotPair = adminPairCtrl.editSpotPair.bind(adminPairCtrl);
