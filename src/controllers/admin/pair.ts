import { Context } from "hono";
// services
import {  PairService } from "../../services/index";


const pairService = new PairService();

export class PairController {
  async addPair(c: Context) {
    try {
        const data = await c.req.json();
      const user = await pairService.addPair(data);
      return c.json({ success: true, result: user }, 200);
    } catch (err) {
      console.log('err: ', err);
      throw err;
    }
  }
}
