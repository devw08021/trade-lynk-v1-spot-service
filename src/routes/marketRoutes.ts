import { Hono } from 'hono';
import { MarketController } from '../controllers/marketController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const marketController = new MarketController();
const marketRoutes = new Hono();

marketRoutes.get('/symbols', marketController.getAllSymbols);
marketRoutes.get('/symbol/:symbol', marketController.getSymbolInfo);
marketRoutes.get('/ticker', marketController.getTicker);
marketRoutes.get('/depth/:symbol', marketController.getOrderBook);
marketRoutes.get('/trades/:symbol', marketController.getRecentTrades);
marketRoutes.get('/24h', marketController.get24hStats);

marketRoutes.use('/admin/*', authMiddleware, adminMiddleware);
marketRoutes.post('/admin/symbol', marketController.upsertSymbol);

export default marketRoutes; 