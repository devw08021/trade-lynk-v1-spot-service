// src/validation/pair.js
import mongoose from "mongoose";
import isEmpty from "../lib/isEmpty.js";

export class PairValidation {
  async addSpotPair(c, next) {
    let errors = {};
    let reqBody = {};
    try {
      reqBody = await c.req.json();
    } catch {
      return c.json({ errors: { body: "Invalid JSON" } }, 400);
    }

    if (isEmpty(reqBody.firstCurrencyId)) {
      errors.firstCurrencyId = "Base Currency Field Is Required";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.firstCurrencyId)) {
      errors.firstCurrencyId = "Invalid Base Currency";
    }

    if (isEmpty(reqBody.firstFloatDigit)) {
      errors.firstFloatDigit = "Base Currency Float Digit Field Is Required";
    } else if (isNaN(reqBody.firstFloatDigit)) {
      errors.firstFloatDigit = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.firstFloatDigit) <= 0) {
      errors.firstFloatDigit = "Invalid Value";
    } else if (parseFloat(reqBody.firstFloatDigit) > 6) {
      errors.firstFloatDigit = "Should be lesser than 6";
    }

    if (isEmpty(reqBody.secondCurrencyId)) {
      errors.secondCurrencyId = "Quote Currency Field Is Required";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.secondCurrencyId)) {
      errors.secondCurrencyId = "Invalid Quote Currency";
    } else if (reqBody.firstCurrencyId == reqBody.secondCurrencyId) {
      errors.secondCurrencyId = "Currency Pair  Must not be same";
    }

    if (isEmpty(reqBody.secondFloatDigit)) {
      errors.secondFloatDigit = "Quote Currency Float Digit Field Is Required";
    } else if (isNaN(reqBody.secondFloatDigit)) {
      errors.secondFloatDigit = "Only allow Numeric Value";
    } else if (parseFloat(reqBody.secondFloatDigit) <= 0) {
      errors.secondFloatDigit = "Invalid Value";
    } else if (parseFloat(reqBody.secondFloatDigit) > 6) {
      errors.secondFloatDigit = "Should be lesser than 6";
    }

    if (isEmpty(reqBody.markPrice)) {
      errors.markPrice = "MarkPrice Field Is Required";
    } else if (isNaN(reqBody.markPrice)) {
      errors.markPrice = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.markPrice) <= 0) {
      errors.markPrice = "Invalid Value";
    }

    if (isEmpty(reqBody.minPricePercentage)) {
      errors.minPricePercentage = "Minimum Price Percentage Field Is Required";
    } else if (isNaN(reqBody.minPricePercentage)) {
      errors.minPricePercentage = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minPricePercentage) <= 0) {
      errors.minPricePercentage = "Invalid Value";
    }

    if (isEmpty(reqBody.maxPricePercentage)) {
      errors.maxPricePercentage = "Maximum Price Percentage Field Is Required";
    } else if (isNaN(reqBody.maxPricePercentage)) {
      errors.maxPricePercentage = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maxPricePercentage) <= 0) {
      errors.maxPricePercentage = "Invalid Value";
    }

    if (isEmpty(reqBody.maxQuantity)) {
      errors.maxQuantity = "Maximum Quantity Field Is Required";
    } else if (isNaN(reqBody.maxQuantity)) {
      errors.maxQuantity = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maxQuantity) <= 0) {
      errors.maxQuantity = "Invalid Value";
    } else if (
      parseFloat(reqBody.maxQuantity) <= parseFloat(reqBody.minQuantity)
    ) {
      errors.maxQuantity =
        "Maximum Quantity Must Be Greater Than Minimum Quantity";
    }

    if (isEmpty(reqBody.minQuantity)) {
      errors.minQuantity = "Minimum Quantity Field Is Required";
    } else if (isNaN(reqBody.minQuantity)) {
      errors.minQuantity = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minQuantity) < 0.000001) {
      errors.minQuantity = "Should be greater than 0.000001";
    }

    if (isEmpty(reqBody.maxOrderValue)) {
      errors.maxOrderValue = "Maximum Order Value Field Is Required";
    } else if (isNaN(reqBody.maxOrderValue)) {
      errors.maxOrderValue = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maxOrderValue) <= 0) {
      errors.maxOrderValue = "Invalid Value";
    } else if (
      parseFloat(reqBody.maxOrderValue) <= parseFloat(reqBody.minOrderValue)
    ) {
      errors.maxOrderValue =
        "Maximum Order Value Must Be Greater Than Minimum Order Value";
    }

    if (isEmpty(reqBody.minOrderValue)) {
      errors.minOrderValue = "Minimum Order Value Field Is Required";
    } else if (isNaN(reqBody.minOrderValue)) {
      errors.minOrderValue = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minOrderValue) < 0.000001) {
      errors.minOrderValue = "Should be greater than 0.000001";
    }

    if (isEmpty(reqBody.maker_rebate)) {
      errors.maker_rebate = "Maker Rebate Field Is Required";
    } else if (isNaN(reqBody.maker_rebate)) {
      errors.maker_rebate = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maker_rebate) <= 0) {
      errors.maker_rebate = "Invalid Value";
    }

    if (isEmpty(reqBody.taker_fees)) {
      errors.taker_fees = "Taker Fee Field Is Required";
    } else if (isNaN(reqBody.taker_fees)) {
      errors.taker_fees = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.taker_fees) <= 0) {
      errors.taker_fees = "Invalid Value";
    }

    if (!isEmpty(errors)) {
      return c.json({ errors }, 400);
    }

    c.set("body", reqBody);
    await next();
  }

  async editSpotPair(c, next) {
    let errors = {};
    let reqBody = {};
    try {
      reqBody = await c.req.json();
    } catch {
      return c.json({ errors: { body: "Invalid JSON" } }, 400);
    }

    if (isEmpty(reqBody.pairId)) {
      errors.pairId = "PairId Field Is Required";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.pairId)) {
      errors.pairId = "Invalid PairId";
    }

    if (isEmpty(reqBody.firstCurrencyId)) {
      errors.firstCurrencyId = "Base Currency Field Is Required";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.firstCurrencyId)) {
      errors.firstCurrencyId = "Invalid BaseCurrency";
    }

    if (isEmpty(reqBody.firstFloatDigit)) {
      errors.firstFloatDigit = "BaseCurrency Float Digit Field Is Required";
    } else if (isNaN(reqBody.firstFloatDigit)) {
      errors.firstFloatDigit = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.firstFloatDigit) <= 0) {
      errors.firstFloatDigit = "Invalid Value";
    } else if (parseFloat(reqBody.firstFloatDigit) > 6) {
      errors.firstFloatDigit = "Should be lesser than 6";
    }

    if (isEmpty(reqBody.secondCurrencyId)) {
      errors.secondCurrencyId = "Quote Currency field is required";
    } else if (!mongoose.Types.ObjectId.isValid(reqBody.secondCurrencyId)) {
      errors.secondCurrencyId = "Invalid Quote Currency";
    } else if (reqBody.firstCurrencyId == reqBody.secondCurrencyId) {
      errors.secondCurrencyId = "Currency Pair Must Not Be Same";
    }

    if (isEmpty(reqBody.secondFloatDigit)) {
      errors.secondFloatDigit = "Quote Currency Float Digit Field Is Required";
    } else if (isNaN(reqBody.secondFloatDigit)) {
      errors.secondFloatDigit = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.secondFloatDigit) <= 0) {
      errors.secondFloatDigit = "Invalid Value";
    } else if (parseFloat(reqBody.secondFloatDigit) > 6) {
      errors.secondFloatDigit = "Should be lesser than 6";
    }

    if (isEmpty(reqBody.minPricePercentage)) {
      errors.minPricePercentage = "Minimum Price Percentage Field Is Required";
    } else if (isNaN(reqBody.minPricePercentage)) {
      errors.minPricePercentage = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minPricePercentage) <= 0) {
      errors.minPricePercentage = "Invalid Value";
    }

    if (
      isEmpty(reqBody.maxPricePercentage) ||
      reqBody.maxPricePercentage == 0
    ) {
      errors.maxPricePercentage = "Maximum Price Percentage Field Is Required";
    } else if (isNaN(reqBody.maxPricePercentage)) {
      errors.maxPricePercentage = "Only Allow numeric Value";
    } else if (parseFloat(reqBody.maxPricePercentage) <= 0) {
      errors.maxPricePercentage = "Invalid Value";
    }

    if (isEmpty(reqBody.markPrice)) {
      errors.markPrice = "MarkPrice Field Is Required";
    } else if (isNaN(reqBody.markPrice)) {
      errors.markPrice = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.markPrice) <= 0) {
      errors.markPrice = "Invalid Value";
    }

    if (isEmpty(reqBody.maxQuantity)) {
      errors.maxQuantity = "Maximum Quantity Field Is Required";
    } else if (isNaN(reqBody.maxQuantity)) {
      errors.maxQuantity = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maxQuantity) <= 0) {
      errors.maxQuantity = "Invalid Value";
    } else if (
      parseFloat(reqBody.maxQuantity) <= parseFloat(reqBody.minQuantity)
    ) {
      errors.maxQuantity =
        "Maximum Quantity Must Be Greater Than Minimum Quantity";
    }

    if (isEmpty(reqBody.minQuantity)) {
      errors.minQuantity = "Minimum Quantity Field Is Required";
    } else if (isNaN(reqBody.minQuantity)) {
      errors.minQuantity = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minQuantity) < 0.000001) {
      errors.minQuantity = "Should be greater than 0.000001";
    }

    if (isEmpty(reqBody.maxOrderValue)) {
      errors.maxOrderValue = "Maximum Order Value Field Is Required";
    } else if (isNaN(reqBody.maxOrderValue)) {
      errors.maxOrderValue = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maxOrderValue) <= 0) {
      errors.maxOrderValue = "Invalid Value";
    } else if (
      parseFloat(reqBody.maxOrderValue) <= parseFloat(reqBody.minOrderValue)
    ) {
      errors.maxOrderValue =
        "Maximum Order Value Must Be Greater Than Minimum Order Value";
    }

    if (isEmpty(reqBody.minOrderValue)) {
      errors.minOrderValue = "Minimum Order Value Field Is Required";
    } else if (isNaN(reqBody.minOrderValue)) {
      errors.minOrderValue = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.minOrderValue) < 0.000001) {
      errors.minOrderValue = "Should be greater than 0.000001";
    } else if (parseFloat(reqBody.minOrderValue) <= 0) {
      errors.minOrderValue = "Invalid Value";
    }

    if (isEmpty(reqBody.maker_rebate)) {
      errors.maker_rebate = "Maker Rebate Field Is Required";
    } else if (isNaN(reqBody.maker_rebate)) {
      errors.maker_rebate = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.maker_rebate) <= 0) {
      errors.maker_rebate = "Invalid Value";
    }

    if (isEmpty(reqBody.taker_fees)) {
      errors.taker_fees = "Taker Fees Field Is Required";
    } else if (isNaN(reqBody.taker_fees)) {
      errors.taker_fees = "Only Allow Numeric Value";
    } else if (parseFloat(reqBody.taker_fees) <= 0) {
      errors.taker_fees = "Invalid Value";
    }

    if (!isEmpty(errors)) {
      return c.json({ errors }, 400);
    }

    c.set("body", reqBody);
    await next();
  }
}

export const pairValidation = new PairValidation();
export default pairValidation;

export const addSpotPairValidation =
  pairValidation.addSpotPair.bind(pairValidation);
export const editSpotPairValidation =
  pairValidation.editSpotPair.bind(pairValidation);
