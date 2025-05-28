import { Pair } from "@/models/schema/index";
import { getRepository } from "@/models/repositoryFactory";
import { ApiError } from "../../utils/error";


export class PairService {
      private pairRep = getRepository(Pair);
       async addPair( data: { password: string, code: string }) {
          // const userDoc = await this.pairRep.findById(userId, 'twoFactorSecret password email');
          // if (!userDoc) {
          //   throw new ApiError(404, { code: 'USER_NOT_FOUND', message: 'User not found' });
          // }
        }
}