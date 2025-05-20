import { Hono } from 'hono';
import * as pairCtrl from '@controllers/admin/pair'
const route = new Hono();
route.post('/symbols', pairCtrl.addPair);