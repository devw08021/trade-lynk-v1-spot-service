import { PairModel } from "../../models/schema/index.js";
import { getRepository } from "../../models/repositoryFactory.js";
import { hsetField } from "../../config/redis.js";

export class PairService {
  constructor() {
    this.pairRepo = getRepository(PairModel);
  }

  async setPairsDBtoRedis() {
    try {
      let pairs = await this.pairRepo.find({ status: "active" });
      if (!pairs) return;
      for (let elem of pairs) {
        await hsetField("spotPairdata", elem._id, elem);
      }
    } catch (err) {
      console.log("err:setPairsDBtoRedis ", err);
    }
  }
}
