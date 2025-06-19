import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const PairSchema = new Schema({
    tikerRoot: { type: String, required: true, unique: true },
    baseId: { type: Schema.Types.ObjectId, required: true },
    baseSymbol: { type: String, required: true },
    baseDecimal: { type: Number, required: true },
    quoteId: { type: Schema.Types.ObjectId, required: true },
    quoteSymbol: { type: String, required: true },
    quoteDecimal: { type: Number, required: true },
    minPricePerc: { type: Number, required: true },
    maxPricePerc: { type: Number, required: true },
    maxQty: { type: Number, required: true },
    minQty: { type: Number, required: true },
    makerFee: { type: Number, default: 0 },
    takerFee: { type: Number, default: 0 },
    last: { type: Number, default: 0 },
    marketPrice: { type: Number, required: true },
    low: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    baseVolume: { type: Number, default: 0 },
    quoteVolume: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    markup: { type: Number, default: 0 },
    liquidity: { type: String, required: true },
    status: { type: String, required: true },
}, {
    timestamps: true,
});

export default model('pair', PairSchema, 'pair');

