import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest, UserPayload, UserRole } from '../types/index.js';
import { errorResponse } from '../utils/responses.js';
import express from 'express';
import bodyParser from 'body-parser';
import db from '../helper/database.js';

// if (!db) {
//   console.error('Database connection is not initialized');
//    res.status(500).json({ message: 'Database connection error' });
// }
// import { Pool } from 'pg';

// const db = new Pool();

// export interface AuthRequest extends Request {
//   user?: UserPayload;
//   fetchAll?: boolean; 
// }

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extract Bearer Token

  if (!token) {
     res.status(401).json(errorResponse('Authentication required'));
     return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    (req as AuthenticatedRequest).user = decoded; // Now includes orgId
    next(); // Call next only if the token is valid
  } catch (error) {
    console.error('Token verification failed:', error);
     res.status(401).json(errorResponse('Invalid token'));
     return;
  }
};

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !allowedRoles.includes(authReq.user.role)) {
      res.status(403).json(errorResponse('Access denied'));
      return;
    }
    next();
  };
};

// export const getAllDataForSuperAdmin = async (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     if (!req.user) {
//       res.status(401).json(errorResponse('Unauthorized: Invalid or missing token'));
//       return;
//     }
    
//     req.user.isSuperAdmin = req.user.role === 'superAdmin';

//     // Check for filter parameters in the request body
//     const { email, firstName, lastName, phone } = req.body;

//     // If no filter parameters are provided, set a flag to fetch all data
//     if (!email && !firstName && !lastName && !phone) {
//       req.query.fetchAll = 'true'; // Set a flag to indicate fetching all data
//     } else {
//       req.query.fetchAll = 'false'; // Indicate that filters are applied
//     }

//     next();
//   } catch (error) {
//     console.error('Middleware error:', error);
//     res.status(500).json(errorResponse('Internal server error'));
//   }
// };

export const getAllDataForSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json(errorResponse('Unauthorized: Invalid or missing token'));
      return;
    }

    req.user.isSuperAdmin = req.user.role === 'superAdmin';

    // Set a fetchAll flag in req object (not query)
    req.fetchAll = !req.body.email && !req.body.firstName && !req.body.lastName && !req.body.phone;

    next();
  } catch (error) {
    console.error('Middleware error:', error);
    res.status(500).json(errorResponse('Internal server error'));
  }
};

export const checkAllowedUsers = () => {
  return async (req: Request & AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
          if (req.user.isSuperAdmin) {
              return next();
          }

          const requestedRoute = req.originalUrl.replace(/\/$/, ''); // Remove trailing slash if exists
          const userRole = req.user.role;
          const userEmail = req.user.email;

          console.log(`🔍 Checking access for:`);
          console.log(`   - Full User Object:`, req.user);
          console.log(`   - Email: ${userEmail}`);
          console.log(`   - Role: ${userRole}`);
          console.log(`   - Requested Route: ${requestedRoute}`);

          if (!userEmail) {
              console.error('❌ ERROR: req.user.email is undefined!');
              return res.status(401).json({ message: 'Unauthorized: User email is missing' });
          }

          // Fetch allowed users dynamically
          const result = await db.query(
              `SELECT email, allowed_routes FROM allowed_users 
               WHERE role = $1 
               AND is_active = TRUE`,
              [userRole]
          );

          console.log(`✅ Query Result:`, result.rows);

          // Extract allowed routes for the user
          const allowedUser = result.rows.find(row => row.email === userEmail);

          if (allowedUser) {
              const allowedRoutes = allowedUser.allowed_routes.map(route => route.replace(/\/$/, '')); // Normalize routes

              console.log(`🎯 Allowed Routes for ${userEmail}:`, allowedRoutes);

              // Check if the requested route is in the user's allowed routes
              if (allowedRoutes.includes(requestedRoute)) {
                  console.log(`✅ Access granted for ${userEmail}`);
                  return next();
              }
          }

          console.log(`❌ Access denied for ${userEmail}`);
          return res.status(403).json({ message: 'Access denied for this route' });
      } catch (error) {
          console.error('❌ Middleware Error:', error);
          return res.status(500).json({ message: 'Server error' });
      }
  };
};




// Function to generate access and refresh tokens
const generateTokens = (user: UserPayload) => {
  const accessToken = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  const refreshToken = jwt.sign(user, process.env.JWT_SECRET as string, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

// Route to issue tokens
// export const login = (req: Request, res: Response) => {
//   const user = { userId: 1, role: 'superAdmin' as UserRole };
//   const tokens = generateTokens(user);
  
//   res.json(tokens);
// };

// Middleware to ensure all routes require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticateToken(req, res, next);
};

const app = express();

// Use body-parser only for POST requests
app.use((req, res, next) => {
    if (req.method === 'POST') {
        bodyParser.json()(req, res, next);
    } else {
        next();
    }
});
