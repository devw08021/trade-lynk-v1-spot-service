import { Types } from 'mongoose';


export interface PairInt {
  tikerRoot?: string;
  baseId?: Types.ObjectId;
  baseSymbol?: string;
  baseDecimal?: number;
  quoteId?:  Types.ObjectId;
  quoteSymbol?: string;
  quoteDecimal?: number;
  minPricePerc?: number;
  maxPricePerc?: number;
  maxQty?: number;
  minQty?: number;
  makerFee?: number;
  takerFee?: number;
  last?:number;
  markPrice?:number;
  low?:number;
  high?:number;
  baseVolume?:number;
  quoteVolume?:number;
  change?:number;
  markup?:number;
  liquidity?:string;
  status?:string;
}
