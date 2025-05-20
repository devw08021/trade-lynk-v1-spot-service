import  { Schema, Document, Types, model } from 'mongoose';

export interface ISpotPair extends Document {
  tikerRoot: string;
  baseId: Types.ObjectId;
  baseSymbol: string;
  baseDigit: number;
  quoteId: Types.ObjectId;
  quoteSymbol: string;
  quoteDigit: number;
  minPricePercentage: number;
  maxPricePercentage: number;
  minQty: number;
  maxQty: number;
  makerFee: number;
  takerFee: number;
  markPrice: number;
  low: number;
  high: number;
  baseVolume: number;
  quoteVolume: number;
  markup: number;
  status: 'active' | 'deactive';
  liquidity: 'local' | 'binance';
  createdAt?: Date;
  updatedAt?: Date;
}

const spotPairsSchema = new Schema<ISpotPair>(
  {
    tikerRoot: { type: String, required: true },

    baseId: { type: Schema.Types.ObjectId, required: true, ref: 'currency' },
    baseSymbol: { type: String, required: true, default: '' },
    baseDigit: { type: Number, default: 8 },

    quoteId: { type: Schema.Types.ObjectId, required: true, ref: 'currency' },
    quoteSymbol: { type: String, required: true, default: '' },
    quoteDigit: { type: Number, default: 8 },

    minPricePercentage: { type: Number, default: 0 },
    maxPricePercentage: { type: Number, default: 0 },

    minQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },

    makerFee: { type: Number, default: 0 },
    takerFee: { type: Number, default: 0 },

    markPrice: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    high: { type: Number, default: 0 },

    baseVolume: { type: Number, default: 0 },
    quoteVolume: { type: Number, default: 0 },

    markup: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['active', 'deactive'],
      default: 'active',
    },

    liquidity: {
      type: String,
      enum: ['local', 'binance'],
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);

const SpotPair = model<ISpotPair>('spotPair', spotPairsSchema, 'spotPair');
export default SpotPair;
