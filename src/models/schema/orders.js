// import package
import mongoose from "mongoose";

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const OrderHistorySchema = new Schema({
    pairId: {
        type: ObjectId,
        ref: "pair",
    },
    userId: {
        type: ObjectId,
    },
    userCode: {
        type: String,
        default: "",
    },
    baseId: {
        type: ObjectId,
    },
    baseSymbol: {
        type: String,
        default: "",
    },
    baseDecimal: {
        type: Number,
        default: "",
    },
    quoteId: {
        type: ObjectId,
        ref: "currency",
    },
    quoteSymbol: {
        type: String,
        default: "",
    },
    quoteDecimal: {
        type: Number,
        default: "",
    },
    price: {
        type: Number,
        default: 0,
    },
    qty: {
        type: Number,
        default: 0,
    },
    orderValue: {
        type: Number,
        default: 0,
    },
    initialOrderValue: {
        type: Number,
        default: 0,
    },
    orderType: {
        type: String,
        default: "",
    },
    buyorsell: {
        type: String,
        default: "",
    },
    initalQty: {
        type: Number,
        default: 0,
    },
    avgPrice: {
        type: Number,
        default: 0,
    },
    filledQty: {
        type: Number,
        default: 0,
    },
    flag: {
        type: Boolean,
        required: true,
    },
    makerFee: {
        type: Number,
        default: 0,
    },
    takerFee: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        default: "open",
        enum: ["open", "pending", "completed", "cancel"],
    },
    externalId: {
        type: String,
        default: ""
    },
    liquidity: {
        type: String,
        enum: ['local', 'binance'],
        default: 'local'
    }
}, {
    timestamps: true,
});

export default mongoose.model(
    "orders",
    OrderHistorySchema,
    "orders"
);
