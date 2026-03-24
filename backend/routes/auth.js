import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import prisma from '../prismaClient.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';

// Configure Nodemailer (ensure SMTP is in .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Role check
    if (role && user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(401).json({ error: 'Role mismatch' });
    }

    // Check account lockout
    if (user.lockUntil && new Date() < user.lockUntil) {
      return res.status(403).json({ error: 'Account locked due to too many failed attempts. Try again later.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      let lockUntil = user.lockUntil;

      // Rate limit lock after 5 attempts
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockUntil }
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Login successful - Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
      }
    });

    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Login successful', token, refreshToken, user: payload });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const payload = {
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      employeeId: user.employeeId,
      department: user.department
    };

    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: 'If the email exists, an OTP will be sent.' }); // Safe fail

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await prisma.oTP.create({
      data: { email, otpHash, expiresAt }
    });

    // Try sending email
    try {
      if(process.env.SMTP_USER && process.env.SMTP_PASS) {
         await transporter.sendMail({
            from: `"PrimeCode" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: 'PrimeCode - Password Reset OTP',
            html: `
              <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:500px; margin:0 auto; background:#0a0a0a; border-radius:12px; overflow:hidden; border:1px solid rgba(0,210,255,0.15);">
                <div style="padding:20px 30px; border-bottom:1px solid rgba(0,210,255,0.1); text-align:center; background:linear-gradient(135deg, rgba(0,210,255,0.06), rgba(121,40,202,0.06));">
                  <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:36px;" />
                </div>
                <div style="padding:30px; text-align:center; color:#e2e8f0;">
                  <h2 style="color:#00D2FF; margin:0 0 12px;">Password Reset</h2>
                  <p style="color:#aaa; font-size:14px; line-height:1.6;">Your one-time password (OTP) is:</p>
                  <div style="display:inline-block; background:linear-gradient(135deg, #0891b2, #7c3aed); color:#fff; font-size:32px; font-weight:800; letter-spacing:8px; padding:16px 32px; border-radius:12px; margin:16px 0; box-shadow:0 4px 15px rgba(124, 58, 237, 0.3);">
                    ${otp}
                  </div>
                  <p style="color:rgba(255,255,255,0.7); font-size:13px;">This OTP will expire in <strong style="color:#fff;">15 minutes</strong>.</p>
                  <p style="color:rgba(255,255,255,0.4); font-size:12px; margin-top:20px;">If you didn't request this, please ignore this email.</p>
                </div>
                <div style="padding:16px 30px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; background:rgba(0,0,0,0.3);">
                  <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:20px; opacity:0.5; margin-bottom:6px;" />
                  <p style="margin:4px 0 0; color:rgba(255,255,255,0.15); font-size:10px;">&copy; ${new Date().getFullYear()} PrimeCode Solutions. All rights reserved.</p>
                </div>
              </div>
            `
         });
      } else {
         console.warn('SMTP credentials not provided. OTP is:', otp);
      }
    } catch(err) {
      console.error("Email send error: ", err.message);
    }
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find latest valid OTP for this email
    const otpRecord = await prisma.oTP.findFirst({
      where: { email, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) return res.status(400).json({ error: 'Invalid OTP' });

    // Mark used / cleanup DB
    await prisma.oTP.deleteMany({ where: { email } });

    // Generate short-lived password reset JWT
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '5m' });
    res.json({ message: 'OTP verified', resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ error: 'Missing parameters' });

    const decoded = jwt.verify(resetToken, JWT_SECRET);
    if (!decoded.email) return res.status(400).json({ error: 'Invalid token' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email: decoded.email },
      data: { password: hashedPassword, failedLoginAttempts: 0, lockUntil: null }
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { token } = req; // Extracted from middleware
    const decoded = jwt.decode(token);
    
    if (decoded && decoded.exp) {
      await prisma.tokenBlacklist.create({
        data: {
          token,
          expiresAt: new Date(decoded.exp * 1000)
        }
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Original /register backward compatibility
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, designation } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'EMPLOYEE', designation }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'User registered', token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
