import {
    PairModel
} from "../../models/schema/index.js";
import { getRepository } from "../../models/repositoryFactory.js";



export class PairService {
    constructor() {
        this.pairRepo = getRepository(PairModel);

    }

    async getSymbols(data) { }

}
