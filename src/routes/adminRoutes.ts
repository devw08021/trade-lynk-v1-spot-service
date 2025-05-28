import { Hono } from 'hono';
import { PairController} from '../controllers/index';

const pairCtrl = new PairController();
const adminRoutes = new Hono();

adminRoutes.post('/pair', pairCtrl.addPair);

export default adminRoutes;