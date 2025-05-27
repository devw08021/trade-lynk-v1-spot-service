import { Hono } from 'hono';
import { UserController ,  TwoFaController} from '../controllers/index';
import { authMiddleware } from '../middleware/auth';

const userController = new UserController();
const twoFaController = new TwoFaController();


const userRoutes = new Hono();


userRoutes.get('/profile', authMiddleware, userController.getCurrentUser);
userRoutes.put('/profile', authMiddleware, userController.updateProfile);

userRoutes.post('/updatePassword',authMiddleware,userController.updatePassword);

//2fa
userRoutes.get('/2fa', authMiddleware, twoFaController.get2FaStatus);
userRoutes.post('/2fa/code', authMiddleware, twoFaController.getTwoFaCode);
userRoutes.patch('/2fa/enable', authMiddleware, twoFaController.enableTwoFa);
userRoutes.delete('/2fa/disable', authMiddleware, twoFaController.disableTwoFa);


export default userRoutes;