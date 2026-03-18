import express from 'express';
const router = express.Router();
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

// All routes require HR/ADMIN
router.use(authMiddleware, authorize(['HR', 'ADMIN']));

// ═══ ATTENDANCE REPORTS ═══
router.get('/attendance/register', async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const where = {};
    if (startDate && endDate) { where.date = { gte: new Date(startDate), lte: new Date(endDate) }; }
    if (department) { where.user = { department }; }
    const records = await prisma.attendance.findMany({
      where, orderBy: { date: 'desc' }, take: 500,
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/attendance/late', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { lateMinutes: { gt: 0 } };
    if (startDate && endDate) { where.date = { gte: new Date(startDate), lte: new Date(endDate) }; }
    const records = await prisma.attendance.findMany({
      where, orderBy: { lateMinutes: 'desc' }, take: 200,
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/attendance/overtime', async (req, res) => {
  try {
    const where = { overtime: { gt: 0 } };
    const records = await prisma.attendance.findMany({
      where, orderBy: { overtime: 'desc' }, take: 200,
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ LEAVE REPORTS ═══
router.get('/leave/balance', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { year },
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(balances);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leave/taken', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { status: 'APPROVED' };
    if (startDate && endDate) { where.startDate = { gte: new Date(startDate) }; where.endDate = { lte: new Date(endDate) }; }
    const leaves = await prisma.leave.findMany({
      where, orderBy: { startDate: 'desc' }, take: 300,
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(leaves);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leave/pending', async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' }, orderBy: { appliedOn: 'desc' },
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(leaves);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ PAYROLL REPORTS ═══
router.get('/payroll/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = {};
    if (month) where.month = month;
    if (year) where.year = parseInt(year);
    const payrolls = await prisma.payroll.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 500,
      include: { user: { select: { name: true, employeeId: true, department: true } } }
    });
    res.json(payrolls);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ EMPLOYEE REPORTS ═══
router.get('/employee/master', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true, name: true, email: true, employeeId: true, department: true,
        designation: true, phone: true, status: true, createdAt: true,
        employeeProfile: { select: { joiningDate: true, employmentType: true, workLocation: true, grade: true, dob: true, gender: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/employee/headcount', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', status: 'active' },
      select: { department: true, employeeProfile: { select: { workLocation: true, employmentType: true } } }
    });
    const byDept = {};
    users.forEach(u => {
      const d = u.department || 'Unknown';
      byDept[d] = (byDept[d] || 0) + 1;
    });
    res.json({ total: users.length, byDepartment: byDept });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ PERFORMANCE REPORTS ═══
router.get('/performance/ratings', async (req, res) => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: { overallRating: { not: null } },
      include: { user: { select: { name: true, employeeId: true, department: true } } },
      orderBy: { overallRating: 'desc' }
    });
    res.json(reviews);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/performance/goals', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: { user: { select: { name: true, employeeId: true, department: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
