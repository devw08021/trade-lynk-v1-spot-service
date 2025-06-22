// import package
import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const TradeHistorySchema = new Schema({
    pairId: {
        type: ObjectId,
        ref: "pair",
    },
    baseSymbol: {
        type: String,
        default: "",
    },
    baseId: {
        type: ObjectId,
        ref: "currency",
    },
    quoteSymbol: {
        type: String,
        default: "",
    },
    quoteId: {
        type: ObjectId,
        ref: "currency",
    },
    buyerId: {
        type: ObjectId,
    },
    sellerId: {
        type: ObjectId,
        ref: "user",
    },
    buyOrderId: {
        type: ObjectId,
        ref: "user",
    },
    sellOrderId: {
        type: ObjectId,
        ref: "user",
    },
    buyerCode: {
        type: String,
        default: "",
    },
    sellerCode: {
        type: String,
        default: "",
    },
    tradePrice: {
        type: Number,
        default: 0,
    },
    tradeQty: {
        type: Number,
        default: 0,
    },
    sellerPrice: {
        type: Number,
        default: 0,
    },
    buyerPrice: {
        type: Number,
        default: 0,
    },
    buyerFee: {
        type: Number,
        default: 0,
    },
    sellerFee: {
        type: Number,
        default: 0,
    },
    sellOrderType: {
        type: String,
        default: "",
    },
    buyOrderType: {
        type: String,
        default: "",
    },
    isMaker: {
        type: String,
        default: "",
    },
    tradeOrderValue: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["completed"],
    },
    liquidity: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});

export default mongoose.model(
    "trades",
    TradeHistorySchema,
    "trades"
);
