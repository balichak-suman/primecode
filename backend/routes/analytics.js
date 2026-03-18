import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get aggregation data for HR/Admin
router.get('/summary', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    // 1. Headcount by Role
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    // 2. Attendance trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const attendance = await prisma.attendance.groupBy({
      by: ['date'],
      where: { date: { gte: sevenDaysAgo } },
      _count: { id: true }
    });

    // 3. Leave types distribution
    const leaves = await prisma.leave.groupBy({
      by: ['type'],
      _count: { id: true }
    });

    res.json({
      headcount: roles.map(r => ({ name: r.role, value: r._count.id })),
      attendance: attendance.map(a => ({ date: a.date.toISOString().split('T')[0], count: a._count.id })),
      leaves: leaves.map(l => ({ type: l.type, count: l._count.id }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
