import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to calculate business days between two dates
// excluding weekends and provided holidays
const calculateBusinessDays = (start, end, holidays = []) => {
  let count = 0;
  let curDate = new Date(start);
  const endDate = new Date(end);
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    // Check if curDate matches any holiday
    const isHoliday = holidays.some(h => {
      const hDate = new Date(h.date);
      return hDate.toDateString() === curDate.toDateString();
    });

    if (!isWeekend && !isHoliday) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

// ==========================================
// EMPLOYEE ROUTES
// ==========================================

// 1. Get My Leave Balance & Policies
router.get('/my-balance', authMiddleware, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    
    // Attempt to get user profile for grade
    const profile = await prisma.employeeProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    let balance = await prisma.leaveBalance.findFirst({
      where: { userId: req.user.id, year }
    });

    // If no balance exists for the year, initialize it based on policies or defaults
    if (!balance) {
      const defaultBalanceObj = { total: 0, used: 0, remaining: 0 };
      
      let casualQuota = 12, sickQuota = 8, earnedQuota = 15;
      
      // Try to fetch policies and apply them if grade exists
      if (profile && profile.grade) {
         const policies = await prisma.leavePolicy.findMany({ where: { grade: profile.grade } });
         for(let p of policies) {
           if(p.leaveType === 'CASUAL') casualQuota = p.annualQuota;
           if(p.leaveType === 'SICK') sickQuota = p.annualQuota;
           if(p.leaveType === 'EARNED') earnedQuota = p.annualQuota;
         }
      }

      balance = await prisma.leaveBalance.create({
        data: {
          userId: req.user.id,
          year,
          casual: { total: casualQuota, used: 0, remaining: casualQuota },
          sick: { total: sickQuota, used: 0, remaining: sickQuota },
          earned: { total: earnedQuota, used: 0, remaining: earnedQuota },
          compensatory: defaultBalanceObj
        }
      });
    }

    res.json(balance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
});

// 2. Get Holidays (for DatePicker blocking)
router.get('/holidays', authMiddleware, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const startObj = new Date(year, 0, 1);
    const endObj = new Date(year, 11, 31, 23, 59, 59);

    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startObj, lte: endObj } },
      orderBy: { date: 'asc' }
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// 3. Apply for Leave
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, halfDay, attachmentUrl } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ error: 'leaveType, startDate, and endDate are required' });
    }

    // Fetch holidays to exclude them from business days
    const year = new Date(startDate).getFullYear();
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } }
    });

    let days = calculateBusinessDays(startDate, endDate, holidays);
    if (halfDay) days = 0.5;

    if (days <= 0 && !halfDay) {
      return res.status(400).json({ error: 'Selected date range contains 0 business days.' });
    }

    // Check balance for paid leaves
    if (['CASUAL', 'SICK', 'EARNED', 'COMPENSATORY'].includes(leaveType)) {
      const balance = await prisma.leaveBalance.findFirst({
        where: { userId: req.user.id, year }
      });
      if (balance) {
         const typeKey = leaveType.toLowerCase();
         if (balance[typeKey] && balance[typeKey].remaining < days) {
           return res.status(400).json({ error: `Insufficient ${leaveType} balance. Remaining: ${balance[typeKey].remaining}, Requested: ${days}` });
         }
      }
    }

    const leave = await prisma.leave.create({
      data: {
        userId: req.user.id,
        type: leaveType.toLowerCase(), // legacy mapping
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        days,
        halfDay: halfDay || false,
        attachmentUrl,
        status: 'PENDING'
      }
    });

    // Fire socket event to alert HR
    if (req.app.get('io')) {
       req.app.get('io').emit('leave_request', { message: `${req.user.name} applied for ${leaveType}`, userId: req.user.id });
    }

    res.status(201).json(leave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

// 4. Get My Leave History
router.get('/my-leaves', authMiddleware, async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// 5. Cancel Pending Leave
router.put('/cancel/:id', authMiddleware, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id);
    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
    
    if (!leave || leave.userId !== req.user.id || leave.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot cancel this leave request.' });
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: { status: 'CANCELLED' }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel leave' });
  }
});

// ==========================================
// HR / ADMIN ROUTES
// ==========================================

// 6. Get All Leaves (for Calendar or General list)
router.get('/all', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const { status, leaveType, month, year } = req.query;
    let whereClause = {};
    if (status) whereClause.status = status;
    if (leaveType) whereClause.leaveType = leaveType;
    
    // Very basic month/year filtering
    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month) - 1;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0, 23, 59, 59);
      whereClause.startDate = { gte: start, lte: end };
    }

    const leaves = await prisma.leave.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, avatar: true, employeeId: true, department: true } }
      },
      orderBy: { appliedOn: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all leaves' });
  }
});

// 7. Get Pending Approvals
router.get('/pending', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, avatar: true, employeeId: true, department: true } }
      },
      orderBy: { appliedOn: 'asc' }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending leaves' });
  }
});

// 8. Approve/Reject Leave
router.put('/review/:id', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id);
    const { status, comments } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Use transaction to update leave and deduct balance if approved
    const updatedLeave = await prisma.$transaction(async (tx) => {
      const leave = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status,
          comments,
          reviewedBy: req.user.id,
          reviewedOn: new Date()
        }
      });

      // If approved and is a tracked paid leave type, deduct balance
      if (status === 'APPROVED' && ['CASUAL', 'SICK', 'EARNED', 'COMPENSATORY'].includes(leave.leaveType)) {
        const year = new Date(leave.startDate).getFullYear();
        const balance = await tx.leaveBalance.findFirst({
          where: { userId: leave.userId, year }
        });
        
        if (balance) {
          const typeKey = leave.leaveType.toLowerCase();
          const currentBal = balance[typeKey];
          const newBal = {
            total: currentBal.total,
            used: currentBal.used + leave.days,
            remaining: currentBal.total - (currentBal.used + leave.days)
          };

          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: { [typeKey]: newBal }
          });
        }
      }

      return leave;
    });

    res.json(updatedLeave);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to review leave' });
  }
});

// 9. Bulk Review
router.post('/bulk-review', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const { leaveIds, status, comments } = req.body;
    
    if (!Array.isArray(leaveIds)) return res.status(400).json({ error: 'leaveIds must be an array' });

    // Simply loop the transaction logic above for now
    // A heavier production app would batch this perfectly, but atomic serial loop is okay here
    let processed = 0;
    for (let id of leaveIds) {
      await prisma.$transaction(async (tx) => {
        const leave = await tx.leave.update({
          where: { id: parseInt(id) },
          data: { status, comments, reviewedBy: req.user.id, reviewedOn: new Date() }
        });
        
        if (status === 'APPROVED' && ['CASUAL', 'SICK', 'EARNED', 'COMPENSATORY'].includes(leave.leaveType)) {
          const year = new Date(leave.startDate).getFullYear();
          const balance = await tx.leaveBalance.findFirst({ where: { userId: leave.userId, year } });
          if (balance) {
            const tk = leave.leaveType.toLowerCase();
            await tx.leaveBalance.update({
              where: { id: balance.id },
              data: { [tk]: { total: balance[tk].total, used: balance[tk].used + leave.days, remaining: balance[tk].remaining - leave.days } }
            });
          }
        }
      });
      processed++;
    }

    res.json({ message: `Processed ${processed} requests successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk review failed' });
  }
});

// ==========================================
// ADMIN POLICY & HOLIDAY Editor
// ==========================================
router.post('/holidays', authMiddleware, authorize('ADMIN'), async (req, res) => {
   try {
     const { name, date, type, description } = req.body;
     const holiday = await prisma.holiday.create({
       data: { name, date: new Date(date), type, description }
     });
     res.status(201).json(holiday);
   } catch(e) {
     res.status(500).json({error: 'Failed to create holiday'});
   }
});

router.post('/policies', authMiddleware, authorize('ADMIN'), async (req, res) => {
   try {
     const { grade, leaveType, annualQuota, maxCarryForward, isEncashable } = req.body;
     const policy = await prisma.leavePolicy.create({
       data: { grade, leaveType, annualQuota: parseFloat(annualQuota), maxCarryForward: parseFloat(maxCarryForward), isEncashable }
     });
     res.status(201).json(policy);
   } catch(e) {
     res.status(500).json({error: 'Failed to create policy'});
   }
});

export default router;
