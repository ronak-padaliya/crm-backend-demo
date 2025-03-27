import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import db from '../helper/database.js';
import { MailService } from '../services/mail.service.js';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses.js';
import { AuthenticatedRequest } from '../types/index.js';
import { authQueries, organizationQueries } from '../query.js';

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            res.status(400).json(errorResponse('Email and password are required'));
            return;
        }

        const userResult = await authQueries.getUserByEmail(email);

        if (userResult.rows.length === 0) {
            res.status(401).json(errorResponse(ResponseMessages.AUTH.LOGIN_FAILED));
            return;
        }

        const user = userResult.rows[0];

        // Validate password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(401).json(errorResponse(ResponseMessages.AUTH.LOGIN_FAILED));
            return;
        }

        // Generate Tokens
        const accessToken = jwt.sign(
          { 
            userId: user.id, 
            email: user.email,
            role: user.role, 
            orgId: user.orgid, 
            orgName: user.orgname,
            adminId: user.adminid,
            supervisorId: user.supervisorid
          },
          process.env.JWT_SECRET as string,
          { expiresIn: '1h' }
        );

        // Generate Refresh Token with separate secret
        const refreshToken = jwt.sign(
          { 
            userId: user.id, 
            email: user.email,
            role: user.role, 
            orgId: user.orgid, 
            orgName: user.orgname,
            adminId: user.adminid,
            supervisorId: user.supervisorid
          },
            process.env.JWT_REFRESH_SECRET as string,
            { expiresIn: '30d' }
        );

        // Store refresh token in database
        await authQueries.storeRefreshToken(
            user.id, 
            refreshToken
        );

        // Send response with tokens
        res.json(successResponse(ResponseMessages.AUTH.LOGIN_SUCCESS, {
            accessToken,
            refreshToken,
            role: user.role,
            email: user.email,
            orgName: user.orgname,
            orgId: user.orgid,
            adminId: user.adminid,
            supervisorId: user.supervisorid
            
        }));

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
}





  // static async forgotPassword(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const { email } = req.body;
  //     const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
  //     const userResult = await db.query(
  //       `SELECT id FROM superadmins WHERE email = $1
  //        UNION ALL
  //        SELECT id FROM admins WHERE email = $1
  //        UNION ALL
  //        SELECT id FROM supervisors WHERE email = $1
  //        UNION ALL
  //        SELECT id FROM salespersons WHERE email = $1`,
  //       [email]
  //     );

  //     if (userResult.rows.length === 0) {
  //       res.status(404).json(errorResponse(ResponseMessages.AUTH.USER_NOT_FOUND));
  //       return;
  //     }

  //     const userId = userResult.rows[0].id;

  //     // Delete any existing OTP
  //     await db.query(
  //       'DELETE FROM password_reset_tokens WHERE user_id = $1',
  //       [userId]
  //     );

  //     // Create new OTP
  //     await db.query(
  //       `INSERT INTO password_reset_tokens (user_id, token, otp, expires_at)
  //        VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
  //       [userId, jwt.sign({ userId }, process.env.JWT_SECRET as string), otp]
  //     );

  //     await MailService.sendPasswordResetMail(email, otp);

  //     res.json(successResponse(ResponseMessages.AUTH.PASSWORD_RESET_SENT));
  //     return;
  //   } catch (error) {
  //     res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
  //     return;
  //   }
  // }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Find user
      const userResult = await authQueries.getUserByEmail(email);
      if (userResult.rows.length === 0) {
        return res.status(404).json(errorResponse(ResponseMessages.AUTH.USER_NOT_FOUND));
      }

      const user = userResult.rows[0];

      // Delete old password reset tokens
      await authQueries.deletePasswordResetToken(user.id);

      // Create new reset token
      await authQueries.createPasswordResetToken(
        user.id,
        jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string),
        otp
      );

      await MailService.sendPasswordResetMail(email, otp);

      return res.json(successResponse(ResponseMessages.AUTH.PASSWORD_RESET_SENT));
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;

      const tokenResult = await authQueries.verifyOTP(email, otp);
      if (tokenResult.rows.length === 0) {
        return res.status(400).json(errorResponse(ResponseMessages.AUTH.INVALID_OTP));
      }

      const token = tokenResult.rows[0];
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await authQueries.updatePassword(hashedPassword, email);

      // Delete the used token
      await authQueries.deletePasswordResetToken(token.user_id);

      return res.json(successResponse(ResponseMessages.AUTH.PASSWORD_RESET_SUCCESS));
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }


  

  static async changePassword(
    req: AuthenticatedRequest<ChangePasswordBody>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId; 

      if (!userId) {
        return res.status(401).json(errorResponse(ResponseMessages.AUTH.USER_NOT_FOUND));
      }

      // Query user from the database
      const userResult = await db.query('SELECT password FROM users WHERE id = $1', [userId]);

      if (userResult.rows.length === 0) {
        return res.status(404).json(errorResponse(ResponseMessages.AUTH.USER_NOT_FOUND));
      }

      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);

      if (!validPassword) {
        return res.status(401).json(errorResponse(ResponseMessages.AUTH.LOGIN_FAILED));
      }

      // Hash the new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

      return res.json(successResponse(ResponseMessages.AUTH.PASSWORD_CHANGED));
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async registerSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, email, password, phone, registrationKey } = req.body;
  
      // Check if registration key is valid and unused
      const keyResult = await db.query(
        'SELECT * FROM superadmin_registration_keys WHERE registration_key = $1 AND is_used = FALSE',
        [registrationKey]
      );
  
      if (keyResult.rows.length === 0) {
        res.status(400).json(errorResponse('Invalid or used registration key'));
        return;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Get role ID for superAdmin
      const roleResult = await db.query(
        "SELECT id FROM roles WHERE role = 'superAdmin'"
      );
  
      if (roleResult.rows.length === 0) {
        res.status(500).json(errorResponse("SuperAdmin role not found in roles table"));
        return;
      }
  
      const roleId = roleResult.rows[0].id;
  
      await db.transaction(async (client) => {
        // ✅ FIXED: Insert into `firstname` and `lastname` instead of `name`
        const userResult = await client.query(
          `INSERT INTO users (email, password, firstname, lastname, role_id, phone)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [email, hashedPassword, firstName, lastName, roleId, phone]
        );
  
        // Mark registration key as used
        await client.query(
          'UPDATE superadmin_registration_keys SET is_used = TRUE, used_at = NOW() WHERE registration_key = $1',
          [registrationKey]
        );
      });
  
      res.status(201).json(successResponse('Super admin registered successfully'));
    } catch (error) {
      console.error('Super admin registration error:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  

  static async logoutHandler(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json(errorResponse('No refresh token found'));
      }
  
      const refreshToken = authHeader.split(' ')[1];
  
      // Delete the refresh token from DB
      await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  
      return res.json(successResponse('Logged out successfully'));
    } catch (error) {
      return res.status(500).json(errorResponse('Server error'));
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("❌ No refresh token found in request headers");
        return res.status(401).json(errorResponse('Refresh token required'));
      }
  
      const refreshToken = authHeader.split(' ')[1];
      console.log("🔹 Received Refresh Token:", refreshToken);
  
      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { userId: string };
      } catch (error) {
        console.log("❌ Invalid JWT Signature:", error.message);
        return res.status(401).json(errorResponse('Invalid refresh token'));
      }
  
      // First check if refresh token exists in database
      const tokenResult = await db.query(
        `SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2`,
        [decoded.userId, refreshToken]
      );
  
      if (tokenResult.rows.length === 0) {
        console.log("❌ Refresh token not found in DB");
        return res.status(401).json(errorResponse('Invalid refresh token'));
      }
  
      // Get user data with correct column names
      const userResult = await db.query(
        // `SELECT u.id, u.email, u.role_id, u.org_id, o.org_name as orgname, u.adminid, u.supervisorid 
        //  FROM users u 
        //  LEFT JOIN organizations o ON u.org_id = o.id 
        //  WHERE u.id = $1`,
        // [decoded.userId]
        `SELECT u.id, u.email, u.password, r.role, 
              u.org_id AS orgId, 
              o.org_name AS orgName,
              u.admin_id AS adminId,
              u.supervisor_id AS supervisorId
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE u.id = $1`,
       [decoded.userId]
      );
  
      if (userResult.rows.length === 0) {
        console.log("❌ User not found");
        return res.status(401).json(errorResponse('User not found'));
      }
  
      const user = userResult.rows[0];
      console.log("✅ User found:", user);
  
      // Generate new access token with full user data
      const newAccessToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role_id,
          orgId: user.orgid, 
          orgName: user.orgname,
          adminId: user.adminid,
          supervisorId: user.supervisorid
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
      );
  
      return res.json(successResponse('Token refreshed', { accessToken: newAccessToken }));
  
    } catch (error) {
      console.error("❌ Server Error in Refresh Token Handler:", error);
      return res.status(500).json(errorResponse('Server error'));
    }
  }
}
