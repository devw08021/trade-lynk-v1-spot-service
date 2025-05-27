import { Hono } from 'hono';
import { AuthController } from '../controllers/authController';

const authController = new AuthController();
const authRoutes = new Hono();

authRoutes.post('/register', authController.register);
authRoutes.post('/login', authController.login);


export default authRoutes;