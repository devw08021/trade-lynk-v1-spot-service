import { Hono } from 'hono';
import { OrderController } from '../controllers/orderController';
import { authMiddleware } from '../middleware/auth';

const orderController = new OrderController();
const orderRoutes = new Hono();

orderRoutes.use('/*', authMiddleware);

orderRoutes.post('/', orderController.createOrder);
orderRoutes.delete('/', orderController.cancelOrder);
orderRoutes.get('/query', orderController.getOrder);
orderRoutes.get('/all', orderController.getOrders);
orderRoutes.get('/open', orderController.getOpenOrders);

export default orderRoutes; 