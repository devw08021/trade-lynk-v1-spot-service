import { Pair } from "@/models/schema/index";
import { Schema } from "mongoose";
import { getRepository } from "@/models/repositoryFactory";
import {hgetField} from '@/config/redis'
import { ApiError } from "@/utils/error";
//interface
import{PairInt} from "@/interfaces/pair"
//lib
import isEmpty from "@/utils/isEmpty"

export class PairService {
      private pairRep = getRepository(Pair);
       async addPair( data: PairInt) {
        let baseCurr = await hgetField('currency','662f52661c2ab16fed9c1a53');
        if(isEmpty(baseCurr)){
          throw new ApiError(404, { code: 'CURRENCY_NOT_FOUND', message: 'Currency not found' });
        }
        let quoteCurr = await hgetField('currency','662f33a036bcf37f78fb88a0');
        if(isEmpty(quoteCurr)){
          throw new ApiError(404, { code: 'CURRENCY_NOT_FOUND', message: 'Currency not found' });
        }
        let exist = await this.pairRep.findOne({baseId:'662f52661c2ab16fed9c1a53',quoteId:'662f33a036bcf37f78fb88a0'})
        if(!isEmpty(exist)){
          throw new ApiError(400, { code: 'PAIR_EXIST', message: 'Pair already exist' });
        }
        let updateDoc ={
          baseId:data?.baseId,
          baseSymbol:data?.baseSymbol,
          quoteId:data?.quoteId,
          quoteSymbol:data?.quoteSymbol,
          quoteDecimal:data?.quoteDecimal,
          minPricePerc:data?.minPricePerc,
          maxPricePerc:data?.maxPricePerc,
          minQty:data?.minQty,
          maxQty:data?.maxQty,
          makerFee:data?.makerFee,
          takerFee:data?.takerFee,
          marketPrice:data?.marketPrice,
          baseVolume:data?.baseVolume,
          quoteVolume:data?.quoteVolume,
          liquidity:data?.liquidity,
          status:'active',
        }
        const result = await this.pairRep.create(updateDoc);
          if (!result) {
            throw new ApiError(400, { code: 'PAIR_ADD_FAILED', message: 'Pair add failed' });
          }
        }
}