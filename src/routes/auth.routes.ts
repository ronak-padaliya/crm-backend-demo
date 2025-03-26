import { Router } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, checkRole } from '../middleware/auth';
import { errorResponse, successResponse } from '../utils/responses'; 
import { validateLogin, validateAddUser, validatePasswordReset, validateSuperAdminRegister } from '../utils/validators';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Wrapper function to handle async routes
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};

const authController = new AuthController();

// Public routes
router.post('/register-superadmin', validateSuperAdminRegister, asyncHandler(AuthController.registerSuperAdmin));
router.post('/login', validateLogin, asyncHandler(AuthController.login));
router.post('/forgot-password', asyncHandler(AuthController.forgotPassword));
router.post('/reset-password', validatePasswordReset, asyncHandler(AuthController.resetPassword));

// Protected routes


router.post(
  '/change-password',
  authenticateToken,
  asyncHandler(AuthController.changePassword)
);

router.post('/refresh-token', asyncHandler(AuthController.refreshToken));
router.post('/logout', asyncHandler(AuthController.logoutHandler));

// router.post('/refresh-token', asyncHandler(async (req: Request, res: Response) => {
//   const { refreshToken } = req.body;

//   if (!refreshToken) {
//     return res.status(401).json(errorResponse('Refresh token required'));
//   }

//   try {
//     const user = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as JwtPayload;

//     const newAccessToken = jwt.sign(
//       { userId: user.userId, role: user.role },
//       process.env.JWT_SECRET as string,
//       { expiresIn: '1h' } 
//     );

//     return res.json(successResponse('Token refreshed', { accessToken: newAccessToken }));
//   } catch (error) {
//     return res.status(401).json(errorResponse('Invalid refresh token'));
//   }
// }));

export default router;
