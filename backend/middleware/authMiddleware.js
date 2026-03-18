import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    const isBlacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token }
    });

    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token is no longer valid' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, employeeId: true, department: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token; // Keep track of token for logout/blacklist
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (typeof roles === 'string') {
      roles = [roles];
    }
    // Roles in DB are 'ADMIN', 'HR', 'EMPLOYEE'
    if (roles.length && req.user && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }
    next();
  };
};

export const activityLogger = async (req, res, next) => {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          method: req.method,
          url: req.originalUrl || req.url,
          ip: req.ip || req.connection?.remoteAddress || 'unknown'
        }
      });
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
  next(); // activityLogger is non-blocking
};

// Aliases for backward compatibility in existing routes 
export const authMiddleware = authenticateToken;
export const authorize = checkRole;
