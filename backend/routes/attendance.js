import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to calculate late minutes
const calculateLateMinutes = async (clockInTime) => {
  // Get active system settings or default
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = { officeStartTime: "09:00", gracePeriodMinutes: 15 };
  }

  const [startHour, startMin] = settings.officeStartTime.split(':').map(Number);
  
  // Create Date object for today's expected start time
  const expectedStart = new Date(clockInTime);
  expectedStart.setHours(startHour, startMin, 0, 0);
  
  // Add grace period
  const graceTime = new Date(expectedStart.getTime() + settings.gracePeriodMinutes * 60000);

  if (clockInTime > graceTime) {
    const diffMs = clockInTime - expectedStart;
    return Math.floor(diffMs / 60000); // return minutes late
  }
  return 0;
};

// ==========================================
// EMPLOYEE ROUTES
// ==========================================

// 1. Clock-in with advanced metrics
router.post('/clock-in', authMiddleware, async (req, res) => {
  try {
    const { location, ipAddress, selfieUrl } = req.body;
    
    // Check if already punched in today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: { gte: startOfDay }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already punched in today.' });
    }

    const clockInTime = new Date();
    const lateMinutes = await calculateLateMinutes(clockInTime);
    
    // Automatically flag as WFH if location logic applies, or fallback to IP logic later
    // For now assuming the frontend passes explicit location string or "REMOTE" based on IP
    let statusEnum = 'PRESENT';
    if (lateMinutes > 0) statusEnum = 'LATE';
    if (location?.toLowerCase().includes('remote')) statusEnum = 'WFH';

    const attendance = await prisma.attendance.create({
      data: {
        userId: req.user.id,
        clockIn: clockInTime,
        status: statusEnum,
        lateMinutes,
        location,
        ipAddress,
        selfieUrl,
        date: startOfDay
      }
    });

    // Fire socket event if available
    if (req.app.get('io')) {
       req.app.get('io').emit('attendance_update', { message: `${req.user.name} clocked in.`, userId: req.user.id });
    }

    res.status(201).json(attendance);
  } catch (error) {
    console.error("Clock In Error:", error);
    res.status(500).json({ error: 'Clock-in failed' });
  }
});

// 2. Clock-out and calculate hours
router.post('/clock-out', authMiddleware, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: { gte: startOfDay },
        clockOut: null
      }
    });

    if (!attendance) {
      return res.status(400).json({ error: 'No active clock-in found for today.' });
    }

    const clockOutTime = new Date();
    const diffMs = clockOutTime - attendance.clockIn;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    
    let overtime = 0;
    if (totalHours > 8) overtime = parseFloat((totalHours - 8).toFixed(2));

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { 
        clockOut: clockOutTime,
        totalHours,
        overtime
      }
    });

    res.json(updated);
  } catch (error) {
    console.error("Clock Out Error:", error);
    res.status(500).json({ error: 'Clock-out failed' });
  }
});

// 3. Get my monthly attendance and stats
router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const history = await prisma.attendance.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    });

    // Aggregate stats
    const stats = {
      PRESENT: history.filter(h => h.status === 'PRESENT').length,
      LATE: history.filter(h => h.status === 'LATE').length,
      ABSENT: history.filter(h => h.status === 'ABSENT').length,
      HALF_DAY: history.filter(h => h.status === 'HALF_DAY').length,
      WFH: history.filter(h => h.status === 'WFH').length,
    };

    res.json({ history, stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// 4. Request Regularization
router.post('/regularize', authMiddleware, async (req, res) => {
  try {
    const { attendanceId, requestedIn, requestedOut, reason } = req.body;

    const reqData = await prisma.attendanceRegularization.create({
      data: {
        attendanceId,
        userId: req.user.id,
        requestedIn: new Date(requestedIn),
        requestedOut: new Date(requestedOut),
        reason
      }
    });

    res.status(201).json({ message: 'Regularization requested successfully', regularization: reqData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request regularization' });
  }
});

// 5. Get My Regularization Requests
router.get('/regularizations', authMiddleware, async (req, res) => {
  try {
    const reqs = await prisma.attendanceRegularization.findMany({
      where: { userId: req.user.id },
      include: { attendance: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reqs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regularizations' });
  }
});

// ==========================================
// HR / ADMIN ROUTES
// ==========================================

// 6. Get All Team Attendance (Search & Filter)
router.get('/all', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const { date, department, status } = req.query;
    
    let whereClause = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setHours(23,59,59,999);
      whereClause.date = { gte: start, lte: end };
    }
    if (status) whereClause.status = status;

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, employeeId: true, department: true, avatar: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Optional frontend department filtering or backend
    const filtered = department ? records.filter(r => r.user.department === department) : records;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active attendance' });
  }
});

// 7. Get Pending Regularizations
router.get('/regularizations/pending', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const requests = await prisma.attendanceRegularization.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, employeeId: true } },
        attendance: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch pending regularizations' });
  }
});

// 8. Approve/Reject Regularization
router.put('/regularizations/:id', authMiddleware, authorize('HR', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    const regId = parseInt(req.params.id);

    const regularization = await prisma.attendanceRegularization.update({
      where: { id: regId },
      data: {
        status,
        managerId: req.user.id
      }
    });

    // If approved, strictly update the actual attendance record
    if (status === 'APPROVED') {
      const diffMs = regularization.requestedOut - regularization.requestedIn;
      const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      
      await prisma.attendance.update({
        where: { id: regularization.attendanceId },
        data: {
          clockIn: regularization.requestedIn,
          clockOut: regularization.requestedOut,
          totalHours: totalHours,
          status: 'PRESENT', // Clear Late/Absent flags
          lateMinutes: 0
        }
      });
    }

    res.json({ message: `Regularization ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process regularization' });
  }
});

export default router;
